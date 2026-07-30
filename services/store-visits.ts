import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAfterCompletionDefault } from '@/services/workflow-preferences';
import type { AfterCompletionMode } from '@/types/after-completion';
import type {
  StoreVisit,
  StoreVisitNote,
  StoreVisitStateSnapshot,
  StoreVisitStatus,
  VisitAdvancementSnapshot,
} from '@/types/store-visit';
import { getTodayDateString } from '@/utils/today-date';
import { resolveLastCompletedVisitForDisplay } from '@/utils/store-visit-presentation';
import { visitHasRemainingRouteWork, isTerminalRouteStopStatus } from '@/utils/route-resolution';

const STORE_VISITS_STORAGE_KEY = '@milemate/store-visits';

let storeVisitsStorageOverride: StoreVisit[] | null = null;

export function __setStoreVisitsStorageForTests(visits: StoreVisit[]): void {
  storeVisitsStorageOverride = [...visits];
}

export function __resetStoreVisitsStorageForTests(): void {
  storeVisitsStorageOverride = null;
}

function isStoreVisitNote(value: unknown): value is StoreVisitNote {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.text === 'string' &&
    typeof record.createdAt === 'number'
  );
}

function isStoreVisit(value: unknown): value is StoreVisit {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.storeId === 'string' &&
    typeof record.scheduledDate === 'string' &&
    typeof record.routeOrder === 'number' &&
    typeof record.status === 'string' &&
    (record.tripId === undefined || typeof record.tripId === 'string') &&
    (record.checkedInAt === undefined || typeof record.checkedInAt === 'number') &&
    (record.checkInSource === undefined ||
      record.checkInSource === 'manual' ||
      record.checkInSource === 'automatic') &&
    (record.automaticCheckInAt === undefined ||
      typeof record.automaticCheckInAt === 'number') &&
    (record.completedAt === undefined || typeof record.completedAt === 'number') &&
    (record.visitDurationMs === undefined ||
      typeof record.visitDurationMs === 'number') &&
    (record.skipReason === undefined ||
      record.skipReason === 'store_closed' ||
      record.skipReason === 'no_delivery' ||
      record.skipReason === 'return_later' ||
      record.skipReason === 'time_constraint' ||
      record.skipReason === 'route_changed' ||
      record.skipReason === 'other') &&
    (record.afterCompletionOverride === undefined ||
      record.afterCompletionOverride === 'open_directions' ||
      record.afterCompletionOverride === 'ask' ||
      record.afterCompletionOverride === 'stay_in_app') &&
    Array.isArray(record.notes) &&
    record.notes.every(isStoreVisitNote) &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number'
  );
}

async function readVisits(): Promise<StoreVisit[]> {
  if (storeVisitsStorageOverride) {
    return [...storeVisitsStorageOverride];
  }

  const stored = await AsyncStorage.getItem(STORE_VISITS_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isStoreVisit);
  } catch {
    return [];
  }
}

async function writeVisits(visits: StoreVisit[]): Promise<void> {
  if (storeVisitsStorageOverride) {
    storeVisitsStorageOverride = [...visits];
    return;
  }

  await AsyncStorage.setItem(STORE_VISITS_STORAGE_KEY, JSON.stringify(visits));
}

function sortVisitsByRouteOrder(visits: StoreVisit[]): StoreVisit[] {
  return [...visits].sort((a, b) => a.routeOrder - b.routeOrder);
}

function snapshotVisitState(visit: StoreVisit): StoreVisitStateSnapshot {
  return {
    status: visit.status,
    checkedInAt: visit.checkedInAt,
    completedAt: visit.completedAt,
  };
}

function applyVisitState(
  visit: StoreVisit,
  snapshot: StoreVisitStateSnapshot,
): StoreVisit {
  return {
    ...visit,
    status: snapshot.status,
    checkedInAt: snapshot.checkedInAt,
    completedAt: snapshot.completedAt,
    updatedAt: Date.now(),
  };
}

export async function getVisitsForDate(
  scheduledDate: string,
): Promise<StoreVisit[]> {
  const visits = await readVisits();

  return sortVisitsByRouteOrder(
    visits.filter((visit) => visit.scheduledDate === scheduledDate),
  );
}

export async function getTodayVisits(): Promise<StoreVisit[]> {
  return getVisitsForDate(getTodayDateString());
}

/** Completed and skipped visits across all scheduled dates. */
export async function getAllResolvedVisits(): Promise<StoreVisit[]> {
  const visits = await readVisits();

  return visits.filter(
    (visit) => visit.status === 'completed' || visit.status === 'skipped',
  );
}

export async function getResolvedVisitsForDate(
  scheduledDate: string,
): Promise<StoreVisit[]> {
  const visits = await getVisitsForDate(scheduledDate);

  return visits.filter(
    (visit) => visit.status === 'completed' || visit.status === 'skipped',
  );
}

export async function getVisitById(visitId: string): Promise<StoreVisit | null> {
  const visits = await readVisits();

  return visits.find((visit) => visit.id === visitId) ?? null;
}

export async function getVisitForStoreOnDate(
  storeId: string,
  scheduledDate: string,
): Promise<StoreVisit | null> {
  const visits = await readVisits();

  return (
    visits.find(
      (visit) =>
        visit.storeId === storeId && visit.scheduledDate === scheduledDate,
    ) ?? null
  );
}

export async function saveVisits(visits: StoreVisit[]): Promise<void> {
  await writeVisits(visits);
}

export async function replaceTodayVisits(visits: StoreVisit[]): Promise<void> {
  const scheduledDate = getTodayDateString();
  const allVisits = await readVisits();
  const otherDays = allVisits.filter((visit) => visit.scheduledDate !== scheduledDate);

  await writeVisits([...otherDays, ...visits]);
}

/** Before Start Route: keep stops reorderable with no active navigation stop. */
export async function prepareVisitsForWorkdayRoutePlanning(): Promise<void> {
  const visits = await getTodayVisits();
  const now = Date.now();

  const updated = visits.map((visit) => {
    if (visit.status === 'completed' || visit.status === 'skipped') {
      return visit;
    }

    return {
      ...visit,
      status: 'pending' as StoreVisitStatus,
      checkedInAt: undefined,
      checkInSource: undefined,
      automaticCheckInAt: undefined,
      completedAt: undefined,
      visitDurationMs: undefined,
      updatedAt: now,
    };
  });

  await replaceTodayVisits(updated);
}

/** Promote the first pending stop (by route order) and begin navigation. */
export async function startTodayRoute(): Promise<void> {
  const sorted = sortVisitsByRouteOrder(await getTodayVisits());
  const firstPending = sorted.find((visit) => visit.status === 'pending');

  if (!firstPending) {
    return;
  }

  const now = Date.now();

  const updated = sorted.map((visit) => {
    if (visit.id !== firstPending.id) {
      return visit;
    }

    return {
      ...visit,
      status: 'current' as StoreVisitStatus,
      updatedAt: now,
    };
  });

  await replaceTodayVisits(updated);
  const { markRouteStartedAt } = await import('@/services/route-session-timing');
  await markRouteStartedAt(now);
}

export async function upsertVisits(newVisits: StoreVisit[]): Promise<void> {
  const visits = await readVisits();
  const visitMap = new Map(visits.map((visit) => [visit.id, visit]));

  for (const visit of newVisits) {
    visitMap.set(visit.id, visit);
  }

  await writeVisits([...visitMap.values()]);
}

export async function attachTripIdToTodayVisits(tripId: string): Promise<void> {
  const scheduledDate = getTodayDateString();
  const visits = await readVisits();
  const now = Date.now();

  const updated = visits.map((visit) => {
    if (visit.scheduledDate !== scheduledDate || visit.tripId) {
      return visit;
    }

    return {
      ...visit,
      tripId,
      updatedAt: now,
    };
  });

  await writeVisits(updated);
}

export async function checkInVisit(
  visitId: string,
  options?: {
    source?: 'manual' | 'automatic';
  },
): Promise<StoreVisit | null> {
  const visits = await readVisits();
  const index = visits.findIndex((visit) => visit.id === visitId);

  if (index === -1) {
    return null;
  }

  const visit = visits[index];

  if (visit.status !== 'pending' && visit.status !== 'current') {
    return visit;
  }

  const source = options?.source ?? 'manual';
  const now = Date.now();

  const updatedVisit: StoreVisit = {
    ...visit,
    status: 'checked_in',
    checkedInAt: now,
    checkInSource: source,
    automaticCheckInAt: source === 'automatic' ? now : undefined,
    updatedAt: now,
  };

  const updated = [...visits];
  updated[index] = updatedVisit;
  await writeVisits(updated);

  void import('@/services/workday-coordinator-integration').then(({ onVisitCheckedIn }) =>
    onVisitCheckedIn(updatedVisit),
  );

  return updatedVisit;
}

export async function undoActiveCheckIn(
  visitId: string,
): Promise<StoreVisit | null> {
  const visits = await readVisits();
  const index = visits.findIndex((visit) => visit.id === visitId);

  if (index === -1) {
    return null;
  }

  const visit = visits[index];

  if (visit.status !== 'checked_in') {
    return visit;
  }

  const updatedVisit: StoreVisit = {
    ...visit,
    status: 'current',
    checkedInAt: undefined,
    checkInSource: undefined,
    automaticCheckInAt: undefined,
    updatedAt: Date.now(),
  };

  const updated = [...visits];
  updated[index] = updatedVisit;
  await writeVisits(updated);

  void import('@/services/workday-coordinator-integration').then(
    ({ refreshWorkdayCoordinatorFromPersistence }) =>
      refreshWorkdayCoordinatorFromPersistence({
        action: 'undoActiveCheckIn',
        completionPhase: 'idle',
      }),
  );

  return updatedVisit;
}

export async function undoAutomaticCheckIn(
  visitId: string,
): Promise<StoreVisit | null> {
  const visits = await readVisits();
  const visit = visits.find((entry) => entry.id === visitId);

  if (!visit || visit.checkInSource !== 'automatic') {
    return visit ?? null;
  }

  if (visit.status === 'completed' || visit.status === 'skipped') {
    return visit;
  }

  return undoActiveCheckIn(visitId);
}

export type CompleteVisitResult = {
  snapshot: VisitAdvancementSnapshot;
  nextStoreId: string | null;
  nextVisitId: string | null;
  nextStoreName: string | null;
  hasNextStop: boolean;
  afterCompletionMode: AfterCompletionMode;
};

export async function resolveAfterCompletionMode(
  visit: StoreVisit,
): Promise<AfterCompletionMode> {
  if (visit.afterCompletionOverride) {
    return visit.afterCompletionOverride;
  }

  return getAfterCompletionDefault();
}

export async function setVisitAfterCompletionOverride(
  visitId: string,
  mode: AfterCompletionMode,
): Promise<StoreVisit | null> {
  const visits = await readVisits();
  const index = visits.findIndex((visit) => visit.id === visitId);

  if (index === -1) {
    return null;
  }

  const updatedVisit: StoreVisit = {
    ...visits[index],
    afterCompletionOverride: mode,
    updatedAt: Date.now(),
  };

  const updated = [...visits];
  updated[index] = updatedVisit;
  await writeVisits(updated);

  return updatedVisit;
}

export async function completeVisit(
  visitId: string,
): Promise<CompleteVisitResult | null> {
  const visits = await readVisits();
  const scheduledDate = getTodayDateString();
  const todaysVisits = sortVisitsByRouteOrder(
    visits.filter((visit) => visit.scheduledDate === scheduledDate),
  );

  const visitIndex = todaysVisits.findIndex((visit) => visit.id === visitId);

  if (visitIndex === -1) {
    return null;
  }

  const visit = todaysVisits[visitIndex];

  if (visit.status !== 'current' && visit.status !== 'checked_in') {
    return null;
  }

  const completedVisitState = snapshotVisitState(visit);
  const now = Date.now();

  const completedVisit: StoreVisit = {
    ...visit,
    status: 'completed',
    completedAt: now,
    visitDurationMs:
      typeof visit.checkedInAt === 'number' && visit.checkedInAt <= now
        ? now - visit.checkedInAt
        : visit.visitDurationMs,
    updatedAt: now,
    afterCompletionOverride: undefined,
  };

  const nextUnresolved = todaysVisits.find(
    (candidate) =>
      candidate.routeOrder > visit.routeOrder &&
      !isTerminalRouteStopStatus(candidate.status),
  );

  const hasNextStop = visitHasRemainingRouteWork(todaysVisits, visit.routeOrder);

  const visitMap = new Map(visits.map((entry) => [entry.id, entry]));
  visitMap.set(visit.id, completedVisit);
  await writeVisits([...visitMap.values()]);

  const { getStoreById } = await import('@/services/stores');
  const nextStore = nextUnresolved ? await getStoreById(nextUnresolved.storeId) : null;

  return {
    snapshot: {
      completedVisitId: visit.id,
      completedVisitState,
      promotedVisitId: nextUnresolved?.id ?? null,
      promotedVisitState: nextUnresolved
        ? snapshotVisitState(nextUnresolved)
        : null,
    },
    nextStoreId: nextUnresolved?.storeId ?? null,
    nextVisitId: nextUnresolved?.id ?? null,
    nextStoreName: nextStore?.name ?? null,
    hasNextStop,
    afterCompletionMode: await resolveAfterCompletionMode(visit),
  };
}

export async function applyVisitPromotion(
  snapshot: VisitAdvancementSnapshot,
): Promise<{ nextStoreId: string | null } | null> {
  if (!snapshot.promotedVisitId) {
    return null;
  }

  const visits = await readVisits();
  const visitMap = new Map(visits.map((visit) => [visit.id, visit]));
  const promotedVisit = visitMap.get(snapshot.promotedVisitId);

  if (!promotedVisit || promotedVisit.status !== 'pending') {
    return {
      nextStoreId: promotedVisit?.storeId ?? null,
    };
  }

  const now = Date.now();

  visitMap.set(snapshot.promotedVisitId, {
    ...promotedVisit,
    status: 'current',
    updatedAt: now,
  });

  await writeVisits([...visitMap.values()]);

  return {
    nextStoreId: promotedVisit.storeId,
  };
}

/** @deprecated Use completeVisit — promotion is deferred until countdown completes. */
export async function completeVisitAndAdvance(
  visitId: string,
): Promise<CompleteVisitResult | null> {
  return completeVisit(visitId);
}

export async function undoVisitAdvancement(
  snapshot: VisitAdvancementSnapshot,
): Promise<void> {
  const visits = await readVisits();
  const visitMap = new Map(visits.map((visit) => [visit.id, visit]));

  const completedVisit = visitMap.get(snapshot.completedVisitId);

  if (completedVisit) {
    visitMap.set(
      snapshot.completedVisitId,
      applyVisitState(completedVisit, snapshot.completedVisitState),
    );
  }

  if (snapshot.promotedVisitId && snapshot.promotedVisitState) {
    const promotedVisit = visitMap.get(snapshot.promotedVisitId);

    if (promotedVisit) {
      visitMap.set(
        snapshot.promotedVisitId,
        applyVisitState(promotedVisit, snapshot.promotedVisitState),
      );
    }
  }

  await writeVisits([...visitMap.values()]);
}

export async function addVisitNote(
  visitId: string,
  text: string,
): Promise<StoreVisit | null> {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  const visits = await readVisits();
  const index = visits.findIndex((visit) => visit.id === visitId);

  if (index === -1) {
    return null;
  }

  const note: StoreVisitNote = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: trimmed,
    createdAt: Date.now(),
  };

  const updatedVisit: StoreVisit = {
    ...visits[index],
    notes: [...visits[index].notes, note],
    updatedAt: Date.now(),
  };

  const updated = [...visits];
  updated[index] = updatedVisit;
  await writeVisits(updated);

  return updatedVisit;
}

export function resolveCurrentVisit(visits: StoreVisit[]): StoreVisit | null {
  const sorted = sortVisitsByRouteOrder(visits);

  return (
    sorted.find(
      (visit) => visit.status === 'current' || visit.status === 'checked_in',
    ) ??
    sorted.find((visit) => visit.status === 'pending') ??
    null
  );
}

export function resolveNextVisit(
  visits: StoreVisit[],
  currentVisit: StoreVisit | null,
): StoreVisit | null {
  const sorted = sortVisitsByRouteOrder(visits);

  if (!currentVisit) {
    return sorted.find((visit) => visit.status === 'pending') ?? null;
  }

  return (
    sorted.find(
      (visit) =>
        visit.status === 'pending' && visit.routeOrder > currentVisit.routeOrder,
    ) ?? null
  );
}

export function countCompletedVisits(visits: StoreVisit[]): number {
  return visits.filter((visit) => visit.status === 'completed').length;
}

export async function getLastCompletedVisitForStore(
  storeId: string,
  activeVisit: StoreVisit | null = null,
): Promise<StoreVisit | null> {
  const visits = await readVisits();
  return resolveLastCompletedVisitForDisplay(visits, storeId, activeVisit);
}
