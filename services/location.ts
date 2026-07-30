import * as Location from 'expo-location';

import {
  applyWorkdayLocationFix,
  getDisplayedUiDistanceMiles,
} from '@/services/workday-distance-accumulator';
import { recordLocationDiagnosticFix } from '@/services/location-diagnostics';
import { publishWorkdayLocationSampleFromUpdate } from '@/services/workday-location-samples';

export type LocationUpdate = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
};

export type LocationWatcher = {
  stop: () => void;
};

export type OneTimeLocationResult =
  | {
      ok: true;
      update: LocationUpdate;
      fromCache: boolean;
    }
  | {
      ok: false;
      reason: 'permission_denied' | 'unavailable';
    };

export type ForegroundPermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
};

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 10,
  timeInterval: 1000,
};

const ONE_TIME_LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
};

const DEFAULT_RECENT_FIX_MAX_AGE_MS = 5 * 60 * 1000;

let recentOneTimeFix: {
  update: LocationUpdate;
  cachedAt: number;
} | null = null;

export function getRecentOneTimeLocationFix(
  maxAgeMs = DEFAULT_RECENT_FIX_MAX_AGE_MS,
): LocationUpdate | null {
  if (!recentOneTimeFix) {
    return null;
  }

  if (Date.now() - recentOneTimeFix.cachedAt > maxAgeMs) {
    return null;
  }

  return recentOneTimeFix.update;
}

export function cacheOneTimeLocationFix(update: LocationUpdate): void {
  recentOneTimeFix = {
    update,
    cachedAt: Date.now(),
  };
}

/** @internal Resets cached one-time fixes between tests. */
export function __clearRecentOneTimeLocationFixForTests(): void {
  recentOneTimeFix = null;
}

/**
 * Requests a single foreground location fix without starting mileage tracking
 * or a GPS watcher. Prefers a recent cached fix when available.
 */
export async function getOneTimeLocationFix(options?: {
  maxCacheAgeMs?: number;
  preferAccumulatorPosition?: () => LocationUpdate | null;
}): Promise<OneTimeLocationResult> {
  const maxCacheAgeMs = options?.maxCacheAgeMs ?? DEFAULT_RECENT_FIX_MAX_AGE_MS;
  const cached = getRecentOneTimeLocationFix(maxCacheAgeMs);

  if (cached) {
    return {
      ok: true,
      update: cached,
      fromCache: true,
    };
  }

  const accumulatorPosition = options?.preferAccumulatorPosition?.() ?? null;

  if (accumulatorPosition) {
    cacheOneTimeLocationFix(accumulatorPosition);

    return {
      ok: true,
      update: accumulatorPosition,
      fromCache: true,
    };
  }

  const permission = await getForegroundPermission();

  if (!permission.granted) {
    return {
      ok: false,
      reason: 'permission_denied',
    };
  }

  try {
    const position = await Location.getCurrentPositionAsync(
      ONE_TIME_LOCATION_OPTIONS,
    );
    const update = toLocationUpdate(position);

    cacheOneTimeLocationFix(update);

    return {
      ok: true,
      update,
      fromCache: false,
    };
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    };
  }
}

export function getLocationWatchConfig(): Location.LocationOptions {
  return { ...WATCH_OPTIONS };
}

function toPermissionResult(
  response: Location.LocationPermissionResponse,
): ForegroundPermissionResult {
  return {
    granted: response.granted,
    canAskAgain: response.canAskAgain,
    status: response.status,
  };
}

function toLocationUpdate(location: Location.LocationObject): LocationUpdate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    timestamp: location.timestamp,
  };
}

/**
 * Returns the current foreground permission state without prompting the user.
 */
export async function getForegroundPermission(): Promise<ForegroundPermissionResult> {
  const response = await Location.getForegroundPermissionsAsync();

  return toPermissionResult(response);
}

/**
 * Requests foreground ("when in use") location permission.
 */
export async function requestForegroundPermission(): Promise<ForegroundPermissionResult> {
  const response = await Location.requestForegroundPermissionsAsync();

  return toPermissionResult(response);
}

/**
 * Starts watching foreground location updates.
 * Caller must request permission first.
 *
 * @returns A watcher with a stop() method to end updates.
 * @throws If foreground permission has not been granted.
 */
export async function startWatchingLocation(
  onUpdate: (update: LocationUpdate) => void,
  onError?: (message: string) => void,
): Promise<LocationWatcher> {
  const { status } = await Location.getForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Foreground location permission not granted');
  }

  const subscription = await Location.watchPositionAsync(
    WATCH_OPTIONS,
    (location) => {
      const update = toLocationUpdate(location);
      const segmentResult = applyWorkdayLocationFix(update);

      recordLocationDiagnosticFix(
        update,
        segmentResult,
        getDisplayedUiDistanceMiles(),
      );
      publishWorkdayLocationSampleFromUpdate(update);
      onUpdate(update);
    },
    onError,
  );

  return {
    stop: () => subscription.remove(),
  };
}
