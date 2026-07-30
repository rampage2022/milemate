import type { LocationUpdate } from '@/services/location';
import { distanceMiles as calculateDistanceMiles } from '@/utils/distance';

export type WorkdayLocationSegmentResult = {
  segmentDistanceMiles: number | null;
  authoritativeDistanceBeforeMiles: number;
  authoritativeDistanceAfterMiles: number;
  ignored: boolean;
  ignoredReason: string | null;
};

export type WorkdayDistanceResetEvent = {
  id: string;
  timestamp: number;
  reason: string;
  authoritativeDistanceBeforeMiles: number;
  authoritativeDistanceAfterMiles: number;
  displayedUiDistanceMiles: number | null;
};

let activeTripId: string | null = null;
let authoritativeDistanceMiles = 0;
let lastPosition: LocationUpdate | null = null;
let displayedUiDistanceMiles = 0;
let distanceSavedAtEndWorkdayMiles: number | null = null;

const resetEvents: WorkdayDistanceResetEvent[] = [];
const listeners = new Set<() => void>();

function createResetEventId(): string {
  return `reset-${Date.now()}-${resetEvents.length + 1}`;
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function recordResetEvent(
  reason: string,
  beforeMiles: number,
  afterMiles: number,
): WorkdayDistanceResetEvent {
  const event: WorkdayDistanceResetEvent = {
    id: createResetEventId(),
    timestamp: Date.now(),
    reason,
    authoritativeDistanceBeforeMiles: beforeMiles,
    authoritativeDistanceAfterMiles: afterMiles,
    displayedUiDistanceMiles,
  };

  resetEvents.push(event);
  notifyListeners();

  return event;
}

export function subscribeToWorkdayDistance(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getActiveAccumulatorTripId(): string | null {
  return activeTripId;
}

export function getAuthoritativeDistanceMiles(): number {
  return authoritativeDistanceMiles;
}

export function getDisplayedUiDistanceMiles(): number {
  return displayedUiDistanceMiles;
}

export function getDistanceSavedAtEndWorkdayMiles(): number | null {
  return distanceSavedAtEndWorkdayMiles;
}

export function getWorkdayDistanceResetEvents(): WorkdayDistanceResetEvent[] {
  return [...resetEvents];
}

export function setDisplayedUiDistanceMiles(distanceMiles: number): void {
  displayedUiDistanceMiles = distanceMiles;
}

export function initializeWorkdayDistanceAccumulator(
  tripId: string,
  options?: {
    distanceMiles?: number;
    lastPosition?: LocationUpdate | null;
    reason?: string;
  },
): void {
  const beforeMiles = authoritativeDistanceMiles;
  const nextDistance = options?.distanceMiles ?? 0;

  activeTripId = tripId;
  authoritativeDistanceMiles = nextDistance;
  lastPosition = options?.lastPosition ?? null;
  displayedUiDistanceMiles = nextDistance;
  distanceSavedAtEndWorkdayMiles = null;
  resetEvents.length = 0;

  recordResetEvent(
    options?.reason ?? 'Workday distance accumulator initialized',
    beforeMiles,
    nextDistance,
  );
}

export function restoreWorkdayDistanceAccumulator(
  tripId: string,
  distanceMiles: number,
  lastPositionUpdate: LocationUpdate | null,
  reason: string,
): void {
  initializeWorkdayDistanceAccumulator(tripId, {
    distanceMiles,
    lastPosition: lastPositionUpdate,
    reason,
  });
}

export function applyWorkdayLocationFix(
  update: LocationUpdate,
): WorkdayLocationSegmentResult {
  const authoritativeDistanceBeforeMiles = authoritativeDistanceMiles;

  let segmentDistanceMiles: number | null = null;
  let ignored = false;
  let ignoredReason: string | null = null;

  if (!lastPosition) {
    ignored = true;
    ignoredReason = 'First fix — baseline only; distance not applied';
  } else {
    segmentDistanceMiles = calculateDistanceMiles(
      {
        latitude: lastPosition.latitude,
        longitude: lastPosition.longitude,
      },
      { latitude: update.latitude, longitude: update.longitude },
    );
    authoritativeDistanceMiles += segmentDistanceMiles;
  }

  lastPosition = update;

  const result: WorkdayLocationSegmentResult = {
    segmentDistanceMiles,
    authoritativeDistanceBeforeMiles,
    authoritativeDistanceAfterMiles: authoritativeDistanceMiles,
    ignored,
    ignoredReason,
  };

  notifyListeners();

  return result;
}

export function clearWorkdayDistanceAccumulator(reason: string): void {
  const beforeMiles = authoritativeDistanceMiles;

  activeTripId = null;
  authoritativeDistanceMiles = 0;
  lastPosition = null;
  displayedUiDistanceMiles = 0;
  distanceSavedAtEndWorkdayMiles = null;

  if (reason.length > 0) {
    recordResetEvent(reason, beforeMiles, 0);
  } else {
    resetEvents.length = 0;
  }

  notifyListeners();
}

export function finalizeWorkdayDistanceAccumulator(): number {
  distanceSavedAtEndWorkdayMiles = authoritativeDistanceMiles;

  recordResetEvent(
    'End Workday — authoritative distance saved to completed trip',
    authoritativeDistanceMiles,
    authoritativeDistanceMiles,
  );

  return authoritativeDistanceMiles;
}

export function getLastAccumulatorPosition(): LocationUpdate | null {
  return lastPosition;
}
