import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  DiagnosticFix,
  DiagnosticResetEvent,
  WorkdayDiagnostic,
} from '@/types/workday-diagnostic';

export const WORKDAY_DIAGNOSTICS_STORAGE_KEY = '@milemate/workday-diagnostics';

function isDiagnosticResetEvent(value: unknown): value is DiagnosticResetEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.timestamp === 'number' &&
    typeof record.reason === 'string' &&
    typeof record.authoritativeDistanceBeforeMiles === 'number' &&
    typeof record.authoritativeDistanceAfterMiles === 'number' &&
    (record.displayedUiDistanceMiles === null ||
      typeof record.displayedUiDistanceMiles === 'number')
  );
}

function isDiagnosticFix(value: unknown): value is DiagnosticFix {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.sequence === 'number' &&
    typeof record.timestamp === 'number' &&
    typeof record.latitude === 'number' &&
    typeof record.longitude === 'number' &&
    (record.horizontalAccuracyMeters === null ||
      typeof record.horizontalAccuracyMeters === 'number') &&
    (record.speedMps === null || typeof record.speedMps === 'number') &&
    (record.distanceFromPreviousMiles === null ||
      typeof record.distanceFromPreviousMiles === 'number') &&
    typeof record.segmentRunningTotalMiles === 'number' &&
    typeof record.ignored === 'boolean' &&
    (record.ignoredReason === null || typeof record.ignoredReason === 'string') &&
    (record.authoritativeDistanceBeforeMiles === undefined ||
      typeof record.authoritativeDistanceBeforeMiles === 'number') &&
    (record.authoritativeDistanceAfterMiles === undefined ||
      typeof record.authoritativeDistanceAfterMiles === 'number') &&
    (record.displayedUiDistanceMiles === undefined ||
      record.displayedUiDistanceMiles === null ||
      typeof record.displayedUiDistanceMiles === 'number') &&
    (record.distanceSavedAtEndWorkdayMiles === undefined ||
      record.distanceSavedAtEndWorkdayMiles === null ||
      typeof record.distanceSavedAtEndWorkdayMiles === 'number')
  );
}

function isWorkdayDiagnostic(value: unknown): value is WorkdayDiagnostic {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.tripId !== 'string' ||
    typeof record.startedAt !== 'string' ||
    (record.endedAt !== undefined && typeof record.endedAt !== 'string') ||
    !Array.isArray(record.fixes) ||
    typeof record.totalFixes !== 'number' ||
    typeof record.acceptedFixes !== 'number' ||
    typeof record.ignoredFixes !== 'number' ||
    typeof record.diagnosticDistanceMiles === 'number'
  ) {
    return false;
  }

  if (
    record.resetEvents !== undefined &&
    (!Array.isArray(record.resetEvents) ||
      !record.resetEvents.every(isDiagnosticResetEvent))
  ) {
    return false;
  }

  if (
    record.distanceSavedAtEndWorkdayMiles !== undefined &&
    record.distanceSavedAtEndWorkdayMiles !== null &&
    typeof record.distanceSavedAtEndWorkdayMiles !== 'number'
  ) {
    return false;
  }

  return record.fixes.every(isDiagnosticFix);
}

async function readDiagnostics(): Promise<WorkdayDiagnostic[]> {
  const stored = await AsyncStorage.getItem(WORKDAY_DIAGNOSTICS_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isWorkdayDiagnostic);
  } catch {
    return [];
  }
}

async function writeDiagnostics(
  diagnostics: WorkdayDiagnostic[],
): Promise<void> {
  await AsyncStorage.setItem(
    WORKDAY_DIAGNOSTICS_STORAGE_KEY,
    JSON.stringify(diagnostics),
  );
}

export async function getWorkdayDiagnostics(): Promise<WorkdayDiagnostic[]> {
  const diagnostics = await readDiagnostics();

  return diagnostics.sort((a, b) => {
    const aTime = Date.parse(a.endedAt ?? a.startedAt);
    const bTime = Date.parse(b.endedAt ?? b.startedAt);

    return bTime - aTime;
  });
}

export async function getWorkdayDiagnosticByTripId(
  tripId: string,
): Promise<WorkdayDiagnostic | null> {
  const diagnostics = await readDiagnostics();

  return diagnostics.find((diagnostic) => diagnostic.tripId === tripId) ?? null;
}

export async function getLatestCompletedWorkdayDiagnostic(): Promise<WorkdayDiagnostic | null> {
  const diagnostics = await readDiagnostics();
  const completed = diagnostics.filter((diagnostic) => diagnostic.endedAt);

  if (completed.length === 0) {
    return null;
  }

  return completed.sort(
    (a, b) => Date.parse(b.endedAt!) - Date.parse(a.endedAt!),
  )[0];
}

export async function getActiveWorkdayDiagnostic(): Promise<WorkdayDiagnostic | null> {
  const diagnostics = await readDiagnostics();

  return diagnostics.find((diagnostic) => diagnostic.endedAt === undefined) ?? null;
}

export async function upsertWorkdayDiagnostic(
  diagnostic: WorkdayDiagnostic,
): Promise<void> {
  const diagnostics = await readDiagnostics();
  const index = diagnostics.findIndex(
    (existing) => existing.tripId === diagnostic.tripId,
  );

  if (index === -1) {
    await writeDiagnostics([diagnostic, ...diagnostics]);
    return;
  }

  const updated = [...diagnostics];
  updated[index] = diagnostic;
  await writeDiagnostics(updated);
}

export async function finalizeWorkdayDiagnostic(
  tripId: string,
  endedAt: number,
  distanceSavedAtEndWorkdayMiles: number,
): Promise<void> {
  const diagnostics = await readDiagnostics();
  const index = diagnostics.findIndex(
    (diagnostic) => diagnostic.tripId === tripId,
  );

  if (index === -1) {
    return;
  }

  const updated = [...diagnostics];
  updated[index] = {
    ...updated[index],
    endedAt: new Date(endedAt).toISOString(),
    distanceSavedAtEndWorkdayMiles,
    diagnosticDistanceMiles: distanceSavedAtEndWorkdayMiles,
  };

  await writeDiagnostics(updated);
}
