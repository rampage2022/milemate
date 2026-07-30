import type { LocationUpdate } from '@/services/location';
import type { WorkdayLocationSegmentResult } from '@/services/workday-distance-accumulator';
import {
  getAuthoritativeDistanceMiles,
  getDistanceSavedAtEndWorkdayMiles,
  getWorkdayDistanceResetEvents,
} from '@/services/workday-distance-accumulator';
import { upsertWorkdayDiagnostic } from '@/services/workday-diagnostics-store';
import type { DiagnosticFix, WorkdayDiagnostic } from '@/types/workday-diagnostic';
import type {
  LocationDiagnosticEntry,
  LocationDiagnosticResetEvent,
} from '@/types/location-diagnostic';

const MAX_ENTRIES = 500;
const PERSIST_THROTTLE_MS = 2000;

export type LocationDiagnosticSummary = {
  acceptedCount: number;
  averageAccuracyMeters: number | null;
  ignoredCount: number;
  segmentRunningTotalMiles: number;
  totalFixes: number;
  authoritativeDistanceMiles: number;
  distanceSavedAtEndWorkdayMiles: number | null;
};

let sequenceCounter = 0;
let activeTripId: string | null = null;
let activeStartedAt: string | null = null;
let persistTimeout: ReturnType<typeof setTimeout> | null = null;
let persistInFlight = false;
let persistQueued = false;

const entries: LocationDiagnosticEntry[] = [];
const listeners = new Set<() => void>();

let cachedEntriesSnapshot: LocationDiagnosticEntry[] = [];
let cachedResetEventsSnapshot: LocationDiagnosticResetEvent[] = [];
let cachedSummarySnapshot: LocationDiagnosticSummary = {
  acceptedCount: 0,
  averageAccuracyMeters: null,
  ignoredCount: 0,
  segmentRunningTotalMiles: 0,
  totalFixes: 0,
  authoritativeDistanceMiles: 0,
  distanceSavedAtEndWorkdayMiles: null,
};

function rebuildSnapshots(): void {
  cachedEntriesSnapshot = [...entries].reverse();
  cachedResetEventsSnapshot = getWorkdayDistanceResetEvents().map((event) => ({
    id: event.id,
    timestamp: event.timestamp,
    reason: event.reason,
    authoritativeDistanceBeforeMiles: event.authoritativeDistanceBeforeMiles,
    authoritativeDistanceAfterMiles: event.authoritativeDistanceAfterMiles,
    displayedUiDistanceMiles: event.displayedUiDistanceMiles,
  }));

  const accepted = entries.filter((entry) => !entry.ignored);
  const ignored = entries.filter((entry) => entry.ignored);
  const accuracyReadings = entries
    .map((entry) => entry.horizontalAccuracyMeters)
    .filter((value): value is number => value !== null);

  const averageAccuracyMeters =
    accuracyReadings.length === 0
      ? null
      : accuracyReadings.reduce((sum, value) => sum + value, 0) /
        accuracyReadings.length;

  const authoritativeDistanceMiles = getAuthoritativeDistanceMiles();

  cachedSummarySnapshot = {
    acceptedCount: accepted.length,
    averageAccuracyMeters,
    ignoredCount: ignored.length,
    segmentRunningTotalMiles: authoritativeDistanceMiles,
    totalFixes: entries.length,
    authoritativeDistanceMiles,
    distanceSavedAtEndWorkdayMiles: getDistanceSavedAtEndWorkdayMiles(),
  };
}

function notifyListeners(): void {
  rebuildSnapshots();

  for (const listener of listeners) {
    listener();
  }
}

function createEntryId(): string {
  return `${Date.now()}-${sequenceCounter}`;
}

function entryToFix(entry: LocationDiagnosticEntry): DiagnosticFix {
  return {
    id: entry.id,
    sequence: entry.sequence,
    timestamp: entry.timestamp,
    latitude: entry.latitude,
    longitude: entry.longitude,
    horizontalAccuracyMeters: entry.horizontalAccuracyMeters,
    speedMps: entry.speedMps,
    distanceFromPreviousMiles: entry.distanceFromPreviousMiles,
    segmentRunningTotalMiles: entry.authoritativeDistanceAfterMiles,
    authoritativeDistanceBeforeMiles: entry.authoritativeDistanceBeforeMiles,
    authoritativeDistanceAfterMiles: entry.authoritativeDistanceAfterMiles,
    displayedUiDistanceMiles: entry.displayedUiDistanceMiles,
    distanceSavedAtEndWorkdayMiles: entry.distanceSavedAtEndWorkdayMiles,
    ignored: entry.ignored,
    ignoredReason: entry.ignoredReason,
  };
}

function fixToEntry(fix: DiagnosticFix): LocationDiagnosticEntry {
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
}

function buildWorkdayDiagnosticFromMemory(): WorkdayDiagnostic | null {
  if (!activeTripId || !activeStartedAt) {
    return null;
  }

  const accepted = entries.filter((entry) => !entry.ignored);
  const authoritativeDistanceMiles = getAuthoritativeDistanceMiles();

  return {
    tripId: activeTripId,
    startedAt: activeStartedAt,
    fixes: entries.map(entryToFix),
    resetEvents: getWorkdayDistanceResetEvents().map((event) => ({
      timestamp: event.timestamp,
      reason: event.reason,
      authoritativeDistanceBeforeMiles: event.authoritativeDistanceBeforeMiles,
      authoritativeDistanceAfterMiles: event.authoritativeDistanceAfterMiles,
      displayedUiDistanceMiles: event.displayedUiDistanceMiles,
    })),
    totalFixes: entries.length,
    acceptedFixes: accepted.length,
    ignoredFixes: entries.filter((entry) => entry.ignored).length,
    diagnosticDistanceMiles: authoritativeDistanceMiles,
    distanceSavedAtEndWorkdayMiles: getDistanceSavedAtEndWorkdayMiles(),
  };
}

async function writeActiveDiagnosticSession(): Promise<void> {
  const diagnostic = buildWorkdayDiagnosticFromMemory();

  if (!diagnostic) {
    return;
  }

  await upsertWorkdayDiagnostic(diagnostic);
}

async function runPersist(): Promise<void> {
  if (!activeTripId) {
    return;
  }

  if (persistInFlight) {
    persistQueued = true;
    return;
  }

  persistInFlight = true;

  try {
    await writeActiveDiagnosticSession();
  } catch (error) {
    console.error('[location-diagnostics] persist workday diagnostic failed:', error);
  } finally {
    persistInFlight = false;

    if (persistQueued) {
      persistQueued = false;
      await runPersist();
    }
  }
}

function schedulePersistActiveDiagnosticSession(): void {
  if (!activeTripId) {
    return;
  }

  if (persistTimeout) {
    return;
  }

  persistTimeout = setTimeout(() => {
    persistTimeout = null;
    void runPersist();
  }, PERSIST_THROTTLE_MS);
}

export async function flushActiveDiagnosticSession(): Promise<void> {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
    persistTimeout = null;
  }

  rebuildSnapshots();
  await runPersist();
}

export function subscribeToLocationDiagnostics(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getLocationDiagnosticEntries(): LocationDiagnosticEntry[] {
  return cachedEntriesSnapshot;
}

export function getLocationDiagnosticResetEvents(): LocationDiagnosticResetEvent[] {
  return cachedResetEventsSnapshot;
}

export function getLocationDiagnosticSummary(): LocationDiagnosticSummary {
  return cachedSummarySnapshot;
}

export function getActiveDiagnosticTripId(): string | null {
  return activeTripId;
}

export async function startDiagnosticSession(
  tripId: string,
  startedAt: number,
): Promise<void> {
  activeTripId = tripId;
  activeStartedAt = new Date(startedAt).toISOString();
  entries.length = 0;
  sequenceCounter = 0;
  notifyListeners();

  try {
    await upsertWorkdayDiagnostic({
      tripId,
      startedAt: activeStartedAt,
      fixes: [],
      resetEvents: getWorkdayDistanceResetEvents().map((event) => ({
        timestamp: event.timestamp,
        reason: event.reason,
        authoritativeDistanceBeforeMiles: event.authoritativeDistanceBeforeMiles,
        authoritativeDistanceAfterMiles: event.authoritativeDistanceAfterMiles,
        displayedUiDistanceMiles: event.displayedUiDistanceMiles,
      })),
      totalFixes: 0,
      acceptedFixes: 0,
      ignoredFixes: 0,
      diagnosticDistanceMiles: getAuthoritativeDistanceMiles(),
      distanceSavedAtEndWorkdayMiles: null,
    });
  } catch (error) {
    console.error('[location-diagnostics] start diagnostic session persist failed:', error);
  }
}

export async function restoreDiagnosticSession(
  diagnostic: WorkdayDiagnostic,
): Promise<void> {
  activeTripId = diagnostic.tripId;
  activeStartedAt = diagnostic.startedAt;
  entries.length = 0;

  const orderedFixes = [...diagnostic.fixes].sort(
    (a, b) => a.sequence - b.sequence,
  );

  for (const fix of orderedFixes) {
    entries.push(fixToEntry(fix));
  }

  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  sequenceCounter =
    entries.length > 0 ? entries[entries.length - 1].sequence : 0;

  notifyListeners();
}

export function clearLocationDiagnostics(): void {
  entries.length = 0;
  sequenceCounter = 0;
  notifyListeners();
  schedulePersistActiveDiagnosticSession();
}

export async function endDiagnosticSession(): Promise<void> {
  activeTripId = null;
  activeStartedAt = null;

  if (persistTimeout) {
    clearTimeout(persistTimeout);
    persistTimeout = null;
  }
}

/**
 * Observes a location fix and the authoritative segment result.
 * Does not calculate distance independently.
 */
export function recordLocationDiagnosticFix(
  update: LocationUpdate,
  segmentResult: WorkdayLocationSegmentResult,
  displayedUiDistanceMiles: number,
): void {
  sequenceCounter += 1;

  const entry: LocationDiagnosticEntry = {
    id: createEntryId(),
    sequence: sequenceCounter,
    timestamp: update.timestamp,
    latitude: update.latitude,
    longitude: update.longitude,
    horizontalAccuracyMeters: update.accuracy,
    speedMps: update.speed,
    distanceFromPreviousMiles: segmentResult.segmentDistanceMiles,
    segmentRunningTotalMiles: segmentResult.authoritativeDistanceAfterMiles,
    authoritativeDistanceBeforeMiles: segmentResult.authoritativeDistanceBeforeMiles,
    authoritativeDistanceAfterMiles: segmentResult.authoritativeDistanceAfterMiles,
    displayedUiDistanceMiles,
    distanceSavedAtEndWorkdayMiles: getDistanceSavedAtEndWorkdayMiles(),
    ignored: segmentResult.ignored,
    ignoredReason: segmentResult.ignoredReason,
  };

  entries.push(entry);

  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }

  notifyListeners();
  schedulePersistActiveDiagnosticSession();
}

export function refreshDiagnosticSnapshots(): void {
  notifyListeners();
}

rebuildSnapshots();
