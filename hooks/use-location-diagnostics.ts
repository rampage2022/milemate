import { useEffect, useState } from 'react';

import {
  clearLocationDiagnostics,
  flushActiveDiagnosticSession,
  getActiveDiagnosticTripId,
  getLocationDiagnosticEntries,
  getLocationDiagnosticResetEvents,
  getLocationDiagnosticSummary,
  restoreDiagnosticSession,
  subscribeToLocationDiagnostics,
  type LocationDiagnosticSummary,
} from '@/services/location-diagnostics';
import { initializeWorkdayDistanceAccumulator } from '@/services/workday-distance-accumulator';
import {
  getLatestCompletedWorkdayDiagnostic,
  getWorkdayDiagnosticByTripId,
} from '@/services/workday-diagnostics-store';
import type {
  LocationDiagnosticEntry,
  LocationDiagnosticResetEvent,
} from '@/types/location-diagnostic';
import type { WorkdayDiagnostic } from '@/types/workday-diagnostic';

type DiagnosticsViewSource = 'live' | 'saved';

function buildSummaryFromDiagnostic(
  diagnostic: WorkdayDiagnostic,
): LocationDiagnosticSummary {
  const accuracyReadings = diagnostic.fixes
    .map((fix) => fix.horizontalAccuracyMeters)
    .filter((value): value is number => value !== null);

  const averageAccuracyMeters =
    accuracyReadings.length === 0
      ? null
      : accuracyReadings.reduce((sum, value) => sum + value, 0) /
        accuracyReadings.length;

  const authoritativeDistanceMiles =
    diagnostic.distanceSavedAtEndWorkdayMiles ?? diagnostic.diagnosticDistanceMiles;

  return {
    acceptedCount: diagnostic.acceptedFixes,
    averageAccuracyMeters,
    ignoredCount: diagnostic.ignoredFixes,
    segmentRunningTotalMiles: authoritativeDistanceMiles,
    totalFixes: diagnostic.totalFixes,
    authoritativeDistanceMiles,
    distanceSavedAtEndWorkdayMiles: diagnostic.distanceSavedAtEndWorkdayMiles,
  };
}

function buildEntriesFromDiagnostic(
  diagnostic: WorkdayDiagnostic,
): LocationDiagnosticEntry[] {
  return [...diagnostic.fixes]
    .sort((a, b) => b.sequence - a.sequence)
    .map((fix) => {
      const authoritativeDistanceAfterMiles =
        fix.authoritativeDistanceAfterMiles ?? fix.segmentRunningTotalMiles;

      return {
        id: fix.id,
        sequence: fix.sequence,
        timestamp: fix.timestamp,
        latitude: fix.latitude,
        longitude: fix.longitude,
        horizontalAccuracyMeters: fix.horizontalAccuracyMeters,
        speedMps: fix.speedMps,
        distanceFromPreviousMiles: fix.distanceFromPreviousMiles,
        segmentRunningTotalMiles: authoritativeDistanceAfterMiles,
        authoritativeDistanceBeforeMiles:
          fix.authoritativeDistanceBeforeMiles ?? authoritativeDistanceAfterMiles,
        authoritativeDistanceAfterMiles,
        displayedUiDistanceMiles: fix.displayedUiDistanceMiles ?? null,
        distanceSavedAtEndWorkdayMiles: fix.distanceSavedAtEndWorkdayMiles ?? null,
        ignored: fix.ignored,
        ignoredReason: fix.ignoredReason,
      };
    });
}

function buildResetEventsFromDiagnostic(
  diagnostic: WorkdayDiagnostic,
): LocationDiagnosticResetEvent[] {
  return (diagnostic.resetEvents ?? []).map((event, index) => ({
    id: `saved-reset-${event.timestamp}-${index}`,
    timestamp: event.timestamp,
    reason: event.reason,
    authoritativeDistanceBeforeMiles: event.authoritativeDistanceBeforeMiles,
    authoritativeDistanceAfterMiles: event.authoritativeDistanceAfterMiles,
    displayedUiDistanceMiles: event.displayedUiDistanceMiles,
  }));
}

export function useLocationDiagnostics(tripId?: string) {
  const [entries, setEntries] = useState<LocationDiagnosticEntry[]>(() =>
    getLocationDiagnosticEntries(),
  );
  const [resetEvents, setResetEvents] = useState<LocationDiagnosticResetEvent[]>(
    () => getLocationDiagnosticResetEvents(),
  );
  const [summary, setSummary] = useState<LocationDiagnosticSummary>(() =>
    getLocationDiagnosticSummary(),
  );
  const [source, setSource] = useState<DiagnosticsViewSource>('live');
  const [loadedTripId, setLoadedTripId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(tripId));

  useEffect(() => {
    let cancelled = false;

    async function loadSavedSession() {
      if (!tripId) {
        const activeTripId = getActiveDiagnosticTripId();

        if (activeTripId) {
          setSource('live');
          setLoadedTripId(activeTripId);
          setEntries(getLocationDiagnosticEntries());
          setResetEvents(getLocationDiagnosticResetEvents());
          setSummary(getLocationDiagnosticSummary());
          setIsLoading(false);
          return;
        }

        const latestCompleted = await getLatestCompletedWorkdayDiagnostic();

        if (cancelled) {
          return;
        }

        if (latestCompleted) {
          setSource('saved');
          setLoadedTripId(latestCompleted.tripId);
          setEntries(buildEntriesFromDiagnostic(latestCompleted));
          setResetEvents(buildResetEventsFromDiagnostic(latestCompleted));
          setSummary(buildSummaryFromDiagnostic(latestCompleted));
        } else {
          setSource('live');
          setLoadedTripId(null);
          setEntries(getLocationDiagnosticEntries());
          setResetEvents(getLocationDiagnosticResetEvents());
          setSummary(getLocationDiagnosticSummary());
        }

        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const diagnostic = await getWorkdayDiagnosticByTripId(tripId);

      if (cancelled) {
        return;
      }

      if (!diagnostic) {
        setSource('live');
        setLoadedTripId(null);
        setEntries(getLocationDiagnosticEntries());
        setResetEvents(getLocationDiagnosticResetEvents());
        setSummary(getLocationDiagnosticSummary());
        setIsLoading(false);
        return;
      }

      const isLiveSession = getActiveDiagnosticTripId() === tripId;

      if (isLiveSession) {
        setSource('live');
        setLoadedTripId(tripId);
        setEntries(getLocationDiagnosticEntries());
        setResetEvents(getLocationDiagnosticResetEvents());
        setSummary(getLocationDiagnosticSummary());
      } else {
        setSource('saved');
        setLoadedTripId(tripId);
        setEntries(buildEntriesFromDiagnostic(diagnostic));
        setResetEvents(buildResetEventsFromDiagnostic(diagnostic));
        setSummary(buildSummaryFromDiagnostic(diagnostic));
      }

      setIsLoading(false);
    }

    void loadSavedSession();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    if (source !== 'live') {
      return;
    }

    const syncDiagnostics = () => {
      setEntries(getLocationDiagnosticEntries());
      setResetEvents(getLocationDiagnosticResetEvents());
      setSummary(getLocationDiagnosticSummary());
    };

    return subscribeToLocationDiagnostics(syncDiagnostics);
  }, [source]);

  const clear = async () => {
    if (source === 'saved') {
      return;
    }

    const activeTripId = getActiveDiagnosticTripId();

    if (!activeTripId) {
      clearLocationDiagnostics();
      return;
    }

    initializeWorkdayDistanceAccumulator(activeTripId, {
      distanceMiles: 0,
      lastPosition: null,
      reason: 'Diagnostics clear — authoritative distance reset',
    });

    clearLocationDiagnostics();

    const diagnostic = await getWorkdayDiagnosticByTripId(activeTripId);

    if (diagnostic) {
      await restoreDiagnosticSession({
        ...diagnostic,
        fixes: [],
        resetEvents: [],
        totalFixes: 0,
        acceptedFixes: 0,
        ignoredFixes: 0,
        diagnosticDistanceMiles: 0,
        distanceSavedAtEndWorkdayMiles: null,
      });
      await flushActiveDiagnosticSession();
    }
  };

  return {
    clear,
    entries,
    isLoading,
    loadedTripId,
    resetEvents,
    source,
    summary,
  };
}
