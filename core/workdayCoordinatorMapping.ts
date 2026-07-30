import type { WorkdayPhase } from '@/core/workdayCoordinator';
import type { PendingVisitAdvancement } from '@/services/pending-advancement';
import {
  countCompletedVisits,
  resolveCurrentVisit,
} from '@/services/store-visits';
import type { StoreVisit } from '@/types/store-visit';

/** Mirrors visit-advancement-context completion phases without importing React. */
export type VisitCompletionPhase =
  | 'idle'
  | 'countdown'
  | 'transitioning'
  | 'all_complete'
  | 'ask_sheet';

export type CoordinatorRouteFields = {
  currentStoreId: string | null;
  currentStoreName: string | null;
  /** One-based stop index — matches visit.routeOrder and UI "Stop N of M". */
  currentStopIndex: number | null;
  completedStopCount: number;
  totalStopCount: number;
  visitStartedAt: string | null;
};

/**
 * Resolves the visit that represents the "current stop" for coordinator state.
 * Mirrors resolveRouteDisplay() in hooks/use-today-route.ts.
 */
export function resolveCoordinatorCurrentVisit(
  visits: StoreVisit[],
  pendingAdvancement: PendingVisitAdvancement | null,
): StoreVisit | null {
  if (pendingAdvancement) {
    const completedVisit = visits.find(
      (visit) => visit.id === pendingAdvancement.completedVisitId,
    );
    const nextVisit = visits.find(
      (visit) => visit.id === pendingAdvancement.nextVisitId,
    );

    if (
      completedVisit?.status === 'completed' &&
      nextVisit?.status === 'pending'
    ) {
      return completedVisit;
    }
  }

  return resolveCurrentVisit(visits);
}

export function deriveCoordinatorPhase(input: {
  hasActiveWorkday: boolean;
  currentVisit: StoreVisit | null;
  pendingAdvancement: PendingVisitAdvancement | null;
  completionPhase: VisitCompletionPhase;
  hasArrived?: boolean;
}): WorkdayPhase {
  if (!input.hasActiveWorkday) {
    return 'idle';
  }

  if (input.completionPhase === 'countdown') {
    return 'completingVisit';
  }

  if (input.completionPhase === 'transitioning') {
    return 'advancing';
  }

  if (input.completionPhase === 'all_complete') {
    return 'finished';
  }

  if (
    input.pendingAdvancement &&
    input.completionPhase === 'idle'
  ) {
    return 'advancing';
  }

  const visit = input.currentVisit;

  if (!visit) {
    return 'ready';
  }

  if (visit.status === 'checked_in') {
    return 'checkedIn';
  }

  if (visit.status === 'completed') {
    return 'finished';
  }

  if (visit.status === 'current' || visit.status === 'pending') {
    if (input.hasArrived) {
      return 'arrived';
    }

    return visit.status === 'current' ? 'driving' : 'ready';
  }

  return 'ready';
}

export function buildCoordinatorRouteFields(input: {
  visits: StoreVisit[];
  pendingAdvancement: PendingVisitAdvancement | null;
  currentVisit: StoreVisit | null;
  currentStoreName: string | null;
}): CoordinatorRouteFields {
  const completedStopCount = countCompletedVisits(input.visits);
  const totalStopCount = input.visits.length;
  const currentVisit = input.currentVisit;

  let visitStartedAt: string | null = null;

  if (
    currentVisit?.status === 'checked_in' &&
    currentVisit.checkedInAt !== undefined
  ) {
    visitStartedAt = new Date(currentVisit.checkedInAt).toISOString();
  }

  return {
    currentStoreId: currentVisit?.storeId ?? null,
    currentStoreName: input.currentStoreName,
    currentStopIndex: currentVisit?.routeOrder ?? null,
    completedStopCount,
    totalStopCount,
    visitStartedAt,
  };
}

export type CoordinatorSnapshotInput = {
  activeWorkdayId: string | null;
  trackedMiles: number;
  visits: StoreVisit[];
  pendingAdvancement: PendingVisitAdvancement | null;
  completionPhase: VisitCompletionPhase;
  currentStoreName?: string | null;
  hasArrived?: boolean;
};

export type CoordinatorSnapshot = {
  activeWorkdayId: string | null;
  phase: WorkdayPhase;
  trackedMiles: number;
  route: CoordinatorRouteFields;
};

export function buildCoordinatorSnapshotFromVisits(
  input: CoordinatorSnapshotInput,
): CoordinatorSnapshot {
  const activeWorkdayId = input.activeWorkdayId;

  if (!activeWorkdayId) {
    return {
      activeWorkdayId: null,
      phase: 'idle',
      trackedMiles: input.trackedMiles,
      route: {
        currentStoreId: null,
        currentStoreName: null,
        currentStopIndex: null,
        completedStopCount: 0,
        totalStopCount: 0,
        visitStartedAt: null,
      },
    };
  }

  const currentVisit = resolveCoordinatorCurrentVisit(
    input.visits,
    input.pendingAdvancement,
  );
  const route = buildCoordinatorRouteFields({
    visits: input.visits,
    pendingAdvancement: input.pendingAdvancement,
    currentVisit,
    currentStoreName: input.currentStoreName ?? null,
  });
  const phase = deriveCoordinatorPhase({
    hasActiveWorkday: true,
    currentVisit,
    pendingAdvancement: input.pendingAdvancement,
    completionPhase: input.completionPhase,
    hasArrived: input.hasArrived,
  });

  return {
    activeWorkdayId,
    phase,
    trackedMiles: input.trackedMiles,
    route,
  };
}
