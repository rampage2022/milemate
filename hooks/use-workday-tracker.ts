import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import {
  clearActiveTrip,
  getActiveTrip,
  saveActiveTrip,
} from '@/services/active-trip';
import {
  getForegroundPermission,
  requestForegroundPermission,
  startWatchingLocation,
  type LocationUpdate,
  type LocationWatcher,
} from '@/services/location';
import {
  endDiagnosticSession,
  flushActiveDiagnosticSession,
  refreshDiagnosticSnapshots,
  restoreDiagnosticSession,
  startDiagnosticSession,
} from '@/services/location-diagnostics';
import { saveTrip } from '@/services/trips';
import { resolveEndRouteEndpointForWorkdayClose } from '@/services/start-day-flow';
import {
  clearWorkdayDistanceAccumulator,
  finalizeWorkdayDistanceAccumulator,
  getAuthoritativeDistanceMiles,
  getLastAccumulatorPosition,
  initializeWorkdayDistanceAccumulator,
  restoreWorkdayDistanceAccumulator,
  setDisplayedUiDistanceMiles,
  subscribeToWorkdayDistance,
} from '@/services/workday-distance-accumulator';
import { clearWorkdayLocationSamples } from '@/services/workday-location-samples';
import {
  onWorkdayEndedSuccess,
  onWorkdayRestored,
  onWorkdayStarted,
  syncTrackedMilesFromAuthoritative,
} from '@/services/workday-coordinator-integration';
import {
  finalizeWorkdayDiagnostic,
  getWorkdayDiagnosticByTripId,
} from '@/services/workday-diagnostics-store';
import type { DiagnosticFix } from '@/types/workday-diagnostic';
import type { Trip } from '@/types/trip';

function createTripId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type WorkdayTrackingStatus = 'idle' | 'starting' | 'active';

function showPermissionSettingsAlert(): void {
  Alert.alert(
    'Location Required',
    'Location must be enabled in device settings to track your workday.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
}

function fixToLastPosition(fix: DiagnosticFix): LocationUpdate {
  return {
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy: fix.horizontalAccuracyMeters,
    speed: fix.speedMps,
    timestamp: fix.timestamp,
  };
}

function resolveRestoreDistance(
  storedTripDistanceMiles: number,
  diagnostic: Awaited<ReturnType<typeof getWorkdayDiagnosticByTripId>>,
): number {
  if (!diagnostic || diagnostic.fixes.length === 0) {
    return storedTripDistanceMiles;
  }

  const lastFix = [...diagnostic.fixes].sort(
    (a, b) => a.sequence - b.sequence,
  )[diagnostic.fixes.length - 1];

  const authoritativeAfter =
    lastFix.authoritativeDistanceAfterMiles ?? lastFix.segmentRunningTotalMiles;

  return Math.max(storedTripDistanceMiles, authoritativeAfter);
}

function resolveRestoreLastPosition(
  diagnostic: Awaited<ReturnType<typeof getWorkdayDiagnosticByTripId>>,
): LocationUpdate | null {
  if (!diagnostic || diagnostic.fixes.length === 0) {
    return getLastAccumulatorPosition();
  }

  const lastFix = [...diagnostic.fixes].sort(
    (a, b) => a.sequence - b.sequence,
  )[diagnostic.fixes.length - 1];

  return fixToLastPosition(lastFix);
}

export function useWorkdayTracker() {
  const [activeWorkday, setActiveWorkday] = useState<Trip | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [hasLocationFix, setHasLocationFix] = useState(false);
  const watcherRef = useRef<LocationWatcher | null>(null);
  const activeWorkdayRef = useRef<Trip | null>(null);
  const isRestoringRef = useRef(true);

  const isWorkdayActive =
    activeWorkday !== null && activeWorkday.endedAt === undefined;
  const distanceMiles = activeWorkday?.distanceMiles ?? 0;
  const startedAt = activeWorkday?.startedAt ?? null;
  const trackingStatus: WorkdayTrackingStatus = !isWorkdayActive
    ? 'idle'
    : hasLocationFix
      ? 'active'
      : 'starting';

  const syncTripDistanceFromAccumulator = useCallback(() => {
    const authoritativeDistance = getAuthoritativeDistanceMiles();

    setDisplayedUiDistanceMiles(authoritativeDistance);
    refreshDiagnosticSnapshots();

    setActiveWorkday((current) => {
      if (!current || current.endedAt !== undefined) {
        return current;
      }

      if (current.distanceMiles === authoritativeDistance) {
        return current;
      }

      return {
        ...current,
        distanceMiles: authoritativeDistance,
      };
    });

    syncTrackedMilesFromAuthoritative(authoritativeDistance);
  }, []);

  const handleLocationUpdate = useCallback((_update: LocationUpdate) => {
    setHasLocationFix(true);
    syncTripDistanceFromAccumulator();
  }, [syncTripDistanceFromAccumulator]);

  const stopWatching = useCallback(() => {
    watcherRef.current?.stop();
    watcherRef.current = null;
  }, []);

  const resumeLocationWatch = useCallback(async () => {
    const permission = await getForegroundPermission();

    if (!permission.granted) {
      return;
    }

    const watcher = await startWatchingLocation(handleLocationUpdate);
    watcherRef.current = watcher;
  }, [handleLocationUpdate]);

  useEffect(() => {
    activeWorkdayRef.current = activeWorkday;
  }, [activeWorkday]);

  useEffect(() => {
    return subscribeToWorkdayDistance(syncTripDistanceFromAccumulator);
  }, [syncTripDistanceFromAccumulator]);

  useEffect(() => {
    let cancelled = false;

    async function restoreActiveWorkday() {
      try {
        const storedTrip = await getActiveTrip();

        if (cancelled || !storedTrip) {
          return;
        }

        const diagnostic = await getWorkdayDiagnosticByTripId(storedTrip.id);
        const restoredDistance = resolveRestoreDistance(
          storedTrip.distanceMiles,
          diagnostic,
        );
        const restoredLastPosition = resolveRestoreLastPosition(diagnostic);

        restoreWorkdayDistanceAccumulator(
          storedTrip.id,
          restoredDistance,
          restoredLastPosition,
          'Restored active workday distance accumulator from persisted session',
        );

        if (diagnostic) {
          await restoreDiagnosticSession(diagnostic);
        } else {
          await startDiagnosticSession(storedTrip.id, storedTrip.startedAt);
        }

        const restoredTrip: Trip = {
          ...storedTrip,
          distanceMiles: restoredDistance,
        };

        setActiveWorkday(restoredTrip);
        setDisplayedUiDistanceMiles(restoredDistance);
        setHasLocationFix(false);
        syncTripDistanceFromAccumulator();

        void onWorkdayRestored(restoredTrip.id, restoredDistance);

        try {
          await resumeLocationWatch();
        } catch (error) {
          console.error('[useWorkdayTracker] restore location watch failed:', error);
        }
      } catch (error) {
        console.error('[useWorkdayTracker] restore active workday failed:', error);
      } finally {
        if (!cancelled) {
          isRestoringRef.current = false;
          setIsRestoring(false);
        }
      }
    }

    void restoreActiveWorkday();

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [resumeLocationWatch, stopWatching, syncTripDistanceFromAccumulator]);

  useEffect(() => {
    if (isRestoringRef.current) {
      return;
    }

    const currentWorkday = activeWorkdayRef.current;

    if (!currentWorkday || currentWorkday.endedAt !== undefined) {
      return;
    }

    const tripToPersist: Trip = {
      ...currentWorkday,
      distanceMiles: getAuthoritativeDistanceMiles(),
    };

    void saveActiveTrip(tripToPersist).catch((error: unknown) => {
      console.error('[useWorkdayTracker] save active trip failed:', error);
    });
  }, [activeWorkday]);

  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  const startWorkday = useCallback(async () => {
    if (isRestoringRef.current) {
      return;
    }

    if (activeWorkday !== null && activeWorkday.endedAt === undefined) {
      return;
    }

    setPermissionDenied(false);

    try {
      const permission = await requestForegroundPermission();

      if (!permission.granted) {
        setPermissionDenied(true);

        if (!permission.canAskAgain) {
          showPermissionSettingsAlert();
        }

        return;
      }

      const trip: Trip = {
        id: createTripId(),
        startedAt: Date.now(),
        distanceMiles: 0,
      };

      initializeWorkdayDistanceAccumulator(trip.id, {
        distanceMiles: 0,
        lastPosition: null,
        reason: 'Start Workday — distance accumulator initialized',
      });

      await startDiagnosticSession(trip.id, trip.startedAt);

      setActiveWorkday(trip);
      activeWorkdayRef.current = trip;
      setDisplayedUiDistanceMiles(0);
      setHasLocationFix(false);
      syncTripDistanceFromAccumulator();

      await resumeLocationWatch();

      void onWorkdayStarted(trip.id, 0);
    } catch (error) {
      console.error('[useWorkdayTracker] startWorkday failed:', error);
      stopWatching();
      setActiveWorkday(null);
      activeWorkdayRef.current = null;
      setHasLocationFix(false);
      await clearActiveTrip();
      clearWorkdayDistanceAccumulator('Start Workday failed — accumulator cleared');
      await endDiagnosticSession();
    }
  }, [activeWorkday, resumeLocationWatch, stopWatching, syncTripDistanceFromAccumulator]);

  const endWorkday = useCallback(async () => {
    const currentWorkday = activeWorkdayRef.current;

    if (!currentWorkday || currentWorkday.endedAt !== undefined) {
      return;
    }

    stopWatching();

    try {
      const authoritativeDistance = finalizeWorkdayDistanceAccumulator();
      refreshDiagnosticSnapshots();

      const completedTrip: Trip = {
        ...currentWorkday,
        distanceMiles: authoritativeDistance,
        endedAt: Date.now(),
      };

      await saveTrip(completedTrip);
      await clearActiveTrip();

      try {
        await resolveEndRouteEndpointForWorkdayClose();
      } catch (error) {
        console.error('[useWorkdayTracker] resolve end route endpoint failed:', error);
      }

      setActiveWorkday(null);
      activeWorkdayRef.current = null;
      setHasLocationFix(false);
      setPermissionDenied(false);

      onWorkdayEndedSuccess();
      clearWorkdayLocationSamples();

      try {
        await flushActiveDiagnosticSession();
        await finalizeWorkdayDiagnostic(
          completedTrip.id,
          completedTrip.endedAt!,
          authoritativeDistance,
        );
        await endDiagnosticSession();
        clearWorkdayDistanceAccumulator('');
      } catch (error) {
        console.error('[useWorkdayTracker] finalize diagnostic session failed:', error);
      }
    } catch (error) {
      console.error('[useWorkdayTracker] endWorkday failed:', error);
    }
  }, [stopWatching]);

  return {
    activeWorkday,
    distanceMiles,
    endWorkday,
    isRestoring,
    isWorkdayActive,
    permissionDenied,
    startedAt,
    startWorkday,
    trackingStatus,
  };
}
