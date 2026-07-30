import {
  getState,
  reset,
  setCurrentStore,
  setStopProgress,
  setTrackedMiles,
  setVisitStartedAt,
  setWorkdayContext,
  type WorkdayPhase,
} from '@/core/workdayCoordinator';
import {
  buildCoordinatorSnapshotFromVisits,
  type VisitCompletionPhase,
} from '@/core/workdayCoordinatorMapping';
import { getActiveTrip } from '@/services/active-trip';
import { getPendingVisitAdvancement } from '@/services/pending-advancement';
import { getStoreById } from '@/services/stores';
import { getTodayVisits } from '@/services/store-visits';
import { resolveCoordinatorCurrentVisit } from '@/core/workdayCoordinatorMapping';
import type { StoreVisit } from '@/types/store-visit';

const MILEAGE_LOG_THRESHOLD = 0.01;
const MILEAGE_NO_OP_DELTA = 0.005;

function isDevEnvironment(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export type RefreshWorkdayCoordinatorOptions = {
  action: string;
  activeWorkdayId?: string | null;
  trackedMiles?: number;
  completionPhase?: VisitCompletionPhase;
  /** Optional UI-only arrival signal; not wired at domain layer by default. */
  hasArrived?: boolean;
};

function logPhaseTransition(
  action: string,
  previousPhase: WorkdayPhase,
  nextPhase: WorkdayPhase,
): void {
  if (!isDevEnvironment()) {
    return;
  }

  if (previousPhase === nextPhase) {
    return;
  }

  console.log(
    `[WorkdayCoordinator] ${action}: ${previousPhase} → ${nextPhase}`,
  );
}

function logTrackedMilesTransition(
  action: string,
  previousMiles: number,
  nextMiles: number,
): void {
  if (!isDevEnvironment()) {
    return;
  }

  const previousRounded = Math.round(previousMiles * 100) / 100;
  const nextRounded = Math.round(nextMiles * 100) / 100;

  if (Math.abs(previousRounded - nextRounded) < MILEAGE_LOG_THRESHOLD) {
    return;
  }

  console.log(
    `[WorkdayCoordinator] ${action}: trackedMiles ${previousRounded} → ${nextRounded}`,
  );
}

async function resolveActiveWorkdayId(
  explicit?: string | null,
): Promise<string | null> {
  if (explicit !== undefined) {
    return explicit;
  }

  const trip = await getActiveTrip();

  if (!trip || trip.endedAt !== undefined) {
    return null;
  }

  return trip.id;
}

type DerivedCoordinatorSnapshot = ReturnType<
  typeof buildCoordinatorSnapshotFromVisits
>;

async function deriveCoordinatorSnapshot(
  options: RefreshWorkdayCoordinatorOptions,
): Promise<DerivedCoordinatorSnapshot> {
  const activeWorkdayId = await resolveActiveWorkdayId(options.activeWorkdayId);
  const trackedMiles =
    options.trackedMiles ?? getState().trackedMiles;
  const completionPhase = options.completionPhase ?? 'idle';

  if (!activeWorkdayId) {
    return buildCoordinatorSnapshotFromVisits({
      activeWorkdayId: null,
      trackedMiles,
      visits: [],
      pendingAdvancement: null,
      completionPhase,
    });
  }

  const [visits, pendingAdvancement] = await Promise.all([
    getTodayVisits(),
    getPendingVisitAdvancement(),
  ]);

  const currentVisit = resolveCoordinatorCurrentVisit(
    visits,
    pendingAdvancement,
  );
  const store = currentVisit
    ? await getStoreById(currentVisit.storeId)
    : null;

  return buildCoordinatorSnapshotFromVisits({
    activeWorkdayId,
    trackedMiles,
    visits,
    pendingAdvancement,
    completionPhase,
    currentStoreName: store?.name ?? null,
    hasArrived: options.hasArrived,
  });
}

function applyDerivedCoordinatorSnapshot(
  snapshot: DerivedCoordinatorSnapshot,
  action: string,
): void {
  const previous = getState();

  if (!snapshot.activeWorkdayId) {
    if (previous.phase !== 'idle' || previous.activeWorkdayId !== null) {
      logPhaseTransition(action, previous.phase, 'idle');
      reset();
    }

    return;
  }

  setWorkdayContext({
    activeWorkdayId: snapshot.activeWorkdayId,
    totalStopCount: snapshot.route.totalStopCount,
    phase: snapshot.phase,
  });
  setStopProgress({
    completedStopCount: snapshot.route.completedStopCount,
    totalStopCount: snapshot.route.totalStopCount,
  });

  if (
    snapshot.route.currentStoreId &&
    snapshot.route.currentStoreName &&
    snapshot.route.currentStopIndex !== null
  ) {
    setCurrentStore({
      storeId: snapshot.route.currentStoreId,
      storeName: snapshot.route.currentStoreName,
      stopIndex: snapshot.route.currentStopIndex,
    });
  } else {
    setCurrentStore(null);
  }

  setTrackedMiles(snapshot.trackedMiles);
  setVisitStartedAt(snapshot.route.visitStartedAt);

  const next = getState();

  if (previous.phase !== next.phase) {
    logPhaseTransition(action, previous.phase, next.phase);
  }
}

export async function refreshWorkdayCoordinatorFromPersistence(
  options: RefreshWorkdayCoordinatorOptions,
): Promise<void> {
  const snapshot = await deriveCoordinatorSnapshot(options);
  applyDerivedCoordinatorSnapshot(snapshot, options.action);
}

export function syncTrackedMilesFromAuthoritative(
  trackedMiles: number,
  action = 'setTrackedMiles',
): void {
  const previous = getState();

  if (Math.abs(previous.trackedMiles - trackedMiles) < MILEAGE_NO_OP_DELTA) {
    return;
  }

  setTrackedMiles(trackedMiles);
  logTrackedMilesTransition(action, previous.trackedMiles, trackedMiles);
}

export async function onWorkdayStarted(
  activeWorkdayId: string,
  trackedMiles = 0,
): Promise<void> {
  await refreshWorkdayCoordinatorFromPersistence({
    action: 'startWorkday',
    activeWorkdayId,
    trackedMiles,
    completionPhase: 'idle',
  });
}

export async function onWorkdayRestored(
  activeWorkdayId: string,
  trackedMiles: number,
): Promise<void> {
  await refreshWorkdayCoordinatorFromPersistence({
    action: 'restoreWorkday',
    activeWorkdayId,
    trackedMiles,
    completionPhase: 'idle',
  });
}

export function onWorkdayEndedSuccess(): void {
  const previous = getState();
  logPhaseTransition('endWorkday', previous.phase, 'idle');
  reset();
}

export async function onVisitCheckedIn(_visit: StoreVisit): Promise<void> {
  await refreshWorkdayCoordinatorFromPersistence({
    action: 'checkIn',
    completionPhase: 'idle',
  });
}

export async function onVisitCompletionPhaseChange(
  completionPhase: VisitCompletionPhase,
  action: string,
): Promise<void> {
  await refreshWorkdayCoordinatorFromPersistence({
    action,
    completionPhase,
  });
}

export async function onVisitCompletionUndone(): Promise<void> {
  await refreshWorkdayCoordinatorFromPersistence({
    action: 'undoCompletion',
    completionPhase: 'idle',
  });
}

export async function onVisitPromoted(): Promise<void> {
  await refreshWorkdayCoordinatorFromPersistence({
    action: 'advanceToNextStore',
    completionPhase: 'idle',
  });
}

/** @internal Applies a derived snapshot for integration tests. */
export function __applyCoordinatorSnapshotForTests(
  snapshot: DerivedCoordinatorSnapshot,
  action: string,
): void {
  applyDerivedCoordinatorSnapshot(snapshot, action);
}
