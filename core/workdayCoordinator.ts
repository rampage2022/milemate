/**
 * Workday Coordinator
 *
 * Single source of truth for the active workday's temporary, in-memory state.
 * Stores and broadcasts truth only — no GPS, persistence, navigation, or UI side effects.
 */

export type WorkdayPhase =
  | 'idle'
  | 'ready'
  | 'driving'
  | 'arrived'
  | 'checkedIn'
  | 'completingVisit'
  | 'advancing'
  | 'finished';

export type WorkdayCoordinatorState = {
  phase: WorkdayPhase;
  activeWorkdayId: string | null;
  currentStoreId: string | null;
  currentStoreName: string | null;
  currentStopIndex: number | null;
  completedStopCount: number;
  totalStopCount: number;
  trackedMiles: number;
  visitStartedAt: string | null;
  updatedAt: string;
};

export type WorkdayContextInput = {
  activeWorkdayId: string;
  totalStopCount?: number;
  phase?: WorkdayPhase;
};

export type CurrentStoreInput = {
  storeId: string;
  storeName: string;
  stopIndex: number;
};

export type StopProgressInput = {
  completedStopCount: number;
  totalStopCount: number;
};

type WorkdayCoordinatorListener = (state: WorkdayCoordinatorState) => void;

const listeners = new Set<WorkdayCoordinatorListener>();

function createInitialState(): WorkdayCoordinatorState {
  return {
    phase: 'idle',
    activeWorkdayId: null,
    currentStoreId: null,
    currentStoreName: null,
    currentStopIndex: null,
    completedStopCount: 0,
    totalStopCount: 0,
    trackedMiles: 0,
    visitStartedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

let state: WorkdayCoordinatorState = freezeState(createInitialState());

function freezeState(
  nextState: WorkdayCoordinatorState,
): WorkdayCoordinatorState {
  return Object.freeze({ ...nextState });
}

function statesEqual(
  left: WorkdayCoordinatorState,
  right: WorkdayCoordinatorState,
): boolean {
  return (
    left.phase === right.phase &&
    left.activeWorkdayId === right.activeWorkdayId &&
    left.currentStoreId === right.currentStoreId &&
    left.currentStoreName === right.currentStoreName &&
    left.currentStopIndex === right.currentStopIndex &&
    left.completedStopCount === right.completedStopCount &&
    left.totalStopCount === right.totalStopCount &&
    left.trackedMiles === right.trackedMiles &&
    left.visitStartedAt === right.visitStartedAt
  );
}

function clampMiles(miles: number): number {
  if (!Number.isFinite(miles)) {
    return 0;
  }

  return Math.max(0, miles);
}

function clampStopProgress(
  completedStopCount: number,
  totalStopCount: number,
): Pick<WorkdayCoordinatorState, 'completedStopCount' | 'totalStopCount'> {
  const safeTotal = Number.isFinite(totalStopCount)
    ? Math.max(0, Math.floor(totalStopCount))
    : 0;
  const safeCompleted = Number.isFinite(completedStopCount)
    ? Math.max(0, Math.floor(completedStopCount))
    : 0;

  return {
    totalStopCount: safeTotal,
    completedStopCount: Math.min(safeCompleted, safeTotal),
  };
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (error) {
      console.error('[workdayCoordinator] listener failed:', error);
    }
  }
}

function commitState(nextState: WorkdayCoordinatorState): WorkdayCoordinatorState {
  const frozen = freezeState(nextState);

  if (statesEqual(state, frozen)) {
    return state;
  }

  state = frozen;
  notifyListeners();
  return state;
}

function mutate(
  partial: Partial<Omit<WorkdayCoordinatorState, 'updatedAt'>>,
): WorkdayCoordinatorState {
  return commitState({
    ...state,
    ...partial,
    updatedAt: new Date().toISOString(),
  });
}

export function getState(): WorkdayCoordinatorState {
  return state;
}

/**
 * Subscribes to coordinator updates.
 * The listener is invoked immediately with the latest state, then on every mutation.
 * Returns an unsubscribe function that is safe to call multiple times.
 */
export function subscribe(listener: WorkdayCoordinatorListener): () => void {
  listeners.add(listener);

  try {
    listener(state);
  } catch (error) {
    console.error('[workdayCoordinator] listener failed:', error);
  }

  let active = true;

  return () => {
    if (!active) {
      return;
    }

    active = false;
    listeners.delete(listener);
  };
}

export function setWorkdayContext(input: WorkdayContextInput): WorkdayCoordinatorState {
  const stopProgress = clampStopProgress(
    state.completedStopCount,
    input.totalStopCount ?? state.totalStopCount,
  );

  return mutate({
    activeWorkdayId: input.activeWorkdayId,
    phase: input.phase ?? 'ready',
    ...stopProgress,
  });
}

export function setPhase(phase: WorkdayPhase): WorkdayCoordinatorState {
  return mutate({ phase });
}

export function setCurrentStore(
  input: CurrentStoreInput | null,
): WorkdayCoordinatorState {
  if (input === null) {
    return mutate({
      currentStoreId: null,
      currentStoreName: null,
      currentStopIndex: null,
    });
  }

  return mutate({
    currentStoreId: input.storeId,
    currentStoreName: input.storeName,
    currentStopIndex: input.stopIndex,
  });
}

export function setStopProgress(input: StopProgressInput): WorkdayCoordinatorState {
  return mutate(clampStopProgress(input.completedStopCount, input.totalStopCount));
}

export function setTrackedMiles(trackedMiles: number): WorkdayCoordinatorState {
  return mutate({ trackedMiles: clampMiles(trackedMiles) });
}

export function setVisitStartedAt(
  visitStartedAt: string | null,
): WorkdayCoordinatorState {
  return mutate({ visitStartedAt });
}

export function startVisit(startedAt: string = new Date().toISOString()): WorkdayCoordinatorState {
  return mutate({
    visitStartedAt: startedAt,
    phase: 'checkedIn',
  });
}

/**
 * Clears the visit timer and moves to completingVisit.
 * Stop progress must be updated explicitly via setStopProgress().
 */
export function completeVisit(): WorkdayCoordinatorState {
  return mutate({
    visitStartedAt: null,
    phase: 'completingVisit',
  });
}

export function reset(): WorkdayCoordinatorState {
  return commitState({
    ...createInitialState(),
    updatedAt: new Date().toISOString(),
  });
}

/** Named export for consumers that prefer a single object handle. */
export const workdayCoordinator = {
  getState,
  subscribe,
  setWorkdayContext,
  setPhase,
  setCurrentStore,
  setStopProgress,
  setTrackedMiles,
  setVisitStartedAt,
  startVisit,
  completeVisit,
  reset,
};

/** @internal Enables unit tests to isolate coordinator state without a public setter. */
export function __replaceStateForTests(
  nextState: WorkdayCoordinatorState,
): WorkdayCoordinatorState {
  return commitState(nextState);
}

/** @internal Restores the initial idle state between tests. */
export function __resetForTests(): WorkdayCoordinatorState {
  listeners.clear();
  state = freezeState(createInitialState());
  return state;
}

export type {
  WorkdayCoordinatorListener,
};
