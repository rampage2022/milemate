import {
  DEFAULT_STORE_ARRIVAL_CONFIG,
  getExitRadiusMeters,
  haversineDistanceMeters,
  type StoreArrivalConfig,
} from '@/services/store-arrival';
import type { AcceptedLocationSample } from '@/types/location-sample';
import type {
  ArrivalEvent,
  ArrivalRejectionReason,
  ArrivalSessionState,
} from '@/types/arrival-session';
import { createInitialArrivalSessionState } from '@/types/arrival-session';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

export type ArrivalEvaluatorInput = {
  previousState: ArrivalSessionState;
  sample: AcceptedLocationSample | null;
  store: Store | null;
  visit: StoreVisit | null;
  workdayActive: boolean;
  config?: StoreArrivalConfig;
  now: number;
  simulateConfirmedArrival?: boolean;
};

export type ArrivalEvaluatorResult = {
  state: ArrivalSessionState;
  events: ArrivalEvent[];
  rejectionReason: ArrivalRejectionReason;
  dwellRemainingMs: number | null;
  hasArrived: boolean;
};

function isVisitEligibleForArrival(visit: StoreVisit | null): boolean {
  if (!visit) {
    return false;
  }

  return visit.status === 'pending' || visit.status === 'current';
}

function resetSession(
  visit: StoreVisit | null,
  store: Store | null,
): ArrivalSessionState {
  const base = createInitialArrivalSessionState();

  if (!visit || !store) {
    return base;
  }

  return {
    ...base,
    visitId: visit.id,
    storeId: store.id,
    status: 'outside',
  };
}

function attachVisitContext(
  state: ArrivalSessionState,
  visit: StoreVisit,
  store: Store,
): ArrivalSessionState {
  return {
    ...state,
    visitId: visit.id,
    storeId: store.id,
  };
}

function isSampleStale(
  sample: AcceptedLocationSample,
  now: number,
  config: StoreArrivalConfig,
): boolean {
  return now - sample.timestamp > config.staleSampleThresholdMs;
}

function isSampleAccuracyAcceptable(
  sample: AcceptedLocationSample,
  config: StoreArrivalConfig,
): boolean {
  if (sample.accuracyMeters === null) {
    return false;
  }

  return sample.accuracyMeters <= config.maxAccuracyMeters;
}

function computeDwellRemainingMs(
  state: ArrivalSessionState,
  now: number,
  config: StoreArrivalConfig,
): number | null {
  if (state.status !== 'dwelling' || state.firstInsideAt === null) {
    return null;
  }

  const elapsed = now - state.firstInsideAt;

  return Math.max(0, config.dwellDurationMs - elapsed);
}

function deriveHasArrived(state: ArrivalSessionState): boolean {
  return state.status === 'arrived' || state.status === 'handled';
}

export function evaluateArrivalSession(
  input: ArrivalEvaluatorInput,
): ArrivalEvaluatorResult {
  const config = input.config ?? DEFAULT_STORE_ARRIVAL_CONFIG;
  const events: ArrivalEvent[] = [];
  let rejectionReason: ArrivalRejectionReason = null;

  if (input.simulateConfirmedArrival) {
    if (!input.visit || !input.store || !isVisitEligibleForArrival(input.visit)) {
      return {
        state: createInitialArrivalSessionState(),
        events,
        rejectionReason: 'visit_not_eligible',
        dwellRemainingMs: null,
        hasArrived: false,
      };
    }

    const now = input.now;

    return {
      state: {
        visitId: input.visit.id,
        storeId: input.store.id,
        status: 'arrived',
        firstInsideAt: now - config.dwellDurationMs,
        lastInsideAt: now,
        consecutiveInsideReadings: config.minimumConsecutiveInsideReadings,
        lastDistanceMeters: 0,
        lastAccuracyMeters: 0,
        arrivedAt: now,
        handledAt: null,
        isInsideZone: true,
      },
      events: [{ type: 'arrival_confirmed' }],
      rejectionReason: null,
      dwellRemainingMs: 0,
      hasArrived: true,
    };
  }

  if (!input.workdayActive) {
    if (input.previousState.status !== 'inactive') {
      events.push({ type: 'arrival_reset' });
    }

    return {
      state: createInitialArrivalSessionState(),
      events,
      rejectionReason: null,
      dwellRemainingMs: null,
      hasArrived: false,
    };
  }

  if (!input.visit || !input.store || !isVisitEligibleForArrival(input.visit)) {
    if (input.previousState.status !== 'inactive') {
      events.push({ type: 'arrival_reset' });
    }

    return {
      state: createInitialArrivalSessionState(),
      events,
      rejectionReason: input.visit ? 'visit_not_eligible' : null,
      dwellRemainingMs: null,
      hasArrived: false,
    };
  }

  if (
    input.previousState.visitId !== null &&
    input.previousState.visitId !== input.visit.id
  ) {
    events.push({ type: 'arrival_reset' });
  }

  let state =
    input.previousState.visitId === input.visit.id
      ? { ...input.previousState }
      : resetSession(input.visit, input.store);

  state = attachVisitContext(state, input.visit, input.store);

  if (
    input.store.latitude === undefined ||
    input.store.longitude === undefined ||
    !Number.isFinite(input.store.latitude) ||
    !Number.isFinite(input.store.longitude)
  ) {
    return {
      state: { ...state, status: 'outside' },
      events,
      rejectionReason: 'no_store_coordinates',
      dwellRemainingMs: null,
      hasArrived: false,
    };
  }

  if (state.status === 'handled') {
    return {
      state,
      events,
      rejectionReason: null,
      dwellRemainingMs: null,
      hasArrived: true,
    };
  }

  if (state.status === 'arrived') {
    return {
      state,
      events,
      rejectionReason: null,
      dwellRemainingMs: 0,
      hasArrived: true,
    };
  }

  if (!input.sample) {
    return {
      state,
      events,
      rejectionReason: 'no_location',
      dwellRemainingMs: computeDwellRemainingMs(state, input.now, config),
      hasArrived: deriveHasArrived(state),
    };
  }

  if (isSampleStale(input.sample, input.now, config)) {
    return {
      state,
      events,
      rejectionReason: 'stale_location',
      dwellRemainingMs: computeDwellRemainingMs(state, input.now, config),
      hasArrived: deriveHasArrived(state),
    };
  }

  if (!isSampleAccuracyAcceptable(input.sample, config)) {
    return {
      state,
      events,
      rejectionReason: 'poor_accuracy',
      dwellRemainingMs: computeDwellRemainingMs(state, input.now, config),
      hasArrived: deriveHasArrived(state),
    };
  }

  const distanceMeters = haversineDistanceMeters(
    {
      latitude: input.sample.latitude,
      longitude: input.sample.longitude,
    },
    {
      latitude: input.store.latitude,
      longitude: input.store.longitude,
    },
  );

  const enterRadius = config.enterRadiusMeters;
  const exitRadius = getExitRadiusMeters(config);
  const wasInside = state.isInsideZone;
  const isInside = wasInside
    ? distanceMeters <= exitRadius
    : distanceMeters <= enterRadius;

  state = {
    ...state,
    lastDistanceMeters: distanceMeters,
    lastAccuracyMeters: input.sample.accuracyMeters,
  };

  if (!isInside) {
    if (wasInside || state.status !== 'outside') {
      events.push({ type: 'arrival_exited' });
    }

    return {
      state: {
        ...resetSession(input.visit, input.store),
        lastDistanceMeters: distanceMeters,
        lastAccuracyMeters: input.sample.accuracyMeters,
      },
      events,
      rejectionReason: null,
      dwellRemainingMs: null,
      hasArrived: false,
    };
  }

  state.isInsideZone = true;
  state.lastInsideAt = input.now;

  if (state.status === 'outside') {
    events.push({ type: 'candidate_started' });
    state.status = 'candidate';
    state.firstInsideAt = input.now;
    state.consecutiveInsideReadings = 1;

    return {
      state,
      events,
      rejectionReason: null,
      dwellRemainingMs: config.dwellDurationMs,
      hasArrived: false,
    };
  }

  state.consecutiveInsideReadings += 1;

  if (state.consecutiveInsideReadings < config.minimumConsecutiveInsideReadings) {
    return {
      state,
      events,
      rejectionReason: null,
      dwellRemainingMs: computeDwellRemainingMs(state, input.now, config),
      hasArrived: false,
    };
  }

  if (state.status === 'candidate') {
    events.push({ type: 'dwell_started' });
    state.status = 'dwelling';
    state.firstInsideAt = state.firstInsideAt ?? input.now;
  }

  const dwellElapsed =
    state.firstInsideAt === null ? 0 : input.now - state.firstInsideAt;

  if (dwellElapsed < config.dwellDurationMs) {
    return {
      state,
      events,
      rejectionReason: null,
      dwellRemainingMs: config.dwellDurationMs - dwellElapsed,
      hasArrived: false,
    };
  }

  if (state.status !== 'arrived') {
    events.push({ type: 'arrival_confirmed' });
  }

  state.status = 'arrived';
  state.arrivedAt = state.arrivedAt ?? input.now;

  return {
    state,
    events,
    rejectionReason: null,
    dwellRemainingMs: 0,
    hasArrived: true,
  };
}

export function markArrivalSessionHandled(
  state: ArrivalSessionState,
  now: number,
): ArrivalSessionState {
  if (state.status !== 'arrived') {
    return state;
  }

  return {
    ...state,
    status: 'handled',
    handledAt: now,
  };
}
