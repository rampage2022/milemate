import { useCallback, useEffect, useRef, useState } from 'react';

import { getDevSimulateArrival } from '@/services/dev-arrival-override';
import {
  estimateEtaMinutes,
  metersToMiles,
  type StoreArrivalConfig,
  DEFAULT_STORE_ARRIVAL_CONFIG,
} from '@/services/store-arrival';
import {
  getLatestWorkdayLocationSample,
  isWorkdayLocationStreamActive,
  subscribeToWorkdayLocationSamples,
} from '@/services/workday-location-samples';
import { getOneTimeLocationFix } from '@/services/location';
import { getLastAccumulatorPosition } from '@/services/workday-distance-accumulator';
import type { AcceptedLocationSample } from '@/types/location-sample';
import type {
  ArrivalRejectionReason,
  ArrivalSessionState,
  ArrivalSessionStatus,
} from '@/types/arrival-session';
import { createInitialArrivalSessionState } from '@/types/arrival-session';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { ArrivalEvent } from '@/types/arrival-session';
import {
  evaluateArrivalSession,
} from '@/utils/arrival-evaluator';
import { logArrivalDevEvent } from '@/services/arrival-check-in';
import { refreshWorkdayCoordinatorFromPersistence } from '@/services/workday-coordinator-integration';
import { toAcceptedLocationSample } from '@/types/location-sample';

const FALLBACK_LOCATION_POLL_MS = 30_000;

export type UseStoreArrivalInput = {
  store: Store | null;
  visit: StoreVisit | null;
  workdayActive: boolean;
  config?: StoreArrivalConfig;
  foregroundScreenActive?: boolean;
  onArrivalEvents?: (events: ArrivalEvent[], state: ArrivalSessionState) => void;
};

export type UseStoreArrivalResult = {
  hasArrived: boolean;
  arrivalStatus: ArrivalSessionStatus;
  distanceMeters: number | null;
  distanceMiles: number | null;
  estimatedEtaMinutes: number | null;
  accuracyMeters: number | null;
  dwellRemainingMs: number | null;
  isSimulated: boolean;
  rejectionReason: ArrivalRejectionReason;
  sessionState: ArrivalSessionState;
};

const EMPTY_RESULT: UseStoreArrivalResult = {
  hasArrived: false,
  arrivalStatus: 'inactive',
  distanceMeters: null,
  distanceMiles: null,
  estimatedEtaMinutes: null,
  accuracyMeters: null,
  dwellRemainingMs: null,
  isSimulated: false,
  rejectionReason: null,
  sessionState: createInitialArrivalSessionState(),
};

function logArrivalEvents(events: ArrivalEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case 'candidate_started':
        logArrivalDevEvent('candidate started');
        break;
      case 'dwell_started':
        logArrivalDevEvent('dwell started');
        break;
      case 'arrival_confirmed':
        logArrivalDevEvent('confirmed');
        break;
      case 'arrival_exited':
        logArrivalDevEvent('exited');
        break;
      case 'arrival_reset':
        logArrivalDevEvent('reset for new visit');
        break;
      default:
        break;
    }
  }
}

function buildResult(
  evaluation: ReturnType<typeof evaluateArrivalSession>,
  isSimulated: boolean,
): UseStoreArrivalResult {
  const distanceMiles =
    evaluation.state.lastDistanceMeters === null
      ? null
      : metersToMiles(evaluation.state.lastDistanceMeters);

  return {
    hasArrived: evaluation.hasArrived,
    arrivalStatus: evaluation.state.status,
    distanceMeters: evaluation.state.lastDistanceMeters,
    distanceMiles,
    estimatedEtaMinutes:
      distanceMiles === null ? null : estimateEtaMinutes(distanceMiles),
    accuracyMeters: evaluation.state.lastAccuracyMeters,
    dwellRemainingMs: evaluation.dwellRemainingMs,
    isSimulated,
    rejectionReason: evaluation.rejectionReason,
    sessionState: evaluation.state,
  };
}

export function useStoreArrival({
  store,
  visit,
  workdayActive,
  config = DEFAULT_STORE_ARRIVAL_CONFIG,
  foregroundScreenActive = false,
  onArrivalEvents,
}: UseStoreArrivalInput): UseStoreArrivalResult {
  const [result, setResult] = useState<UseStoreArrivalResult>(EMPTY_RESULT);
  const sessionRef = useRef<ArrivalSessionState>(createInitialArrivalSessionState());
  const onArrivalEventsRef = useRef(onArrivalEvents);
  const simulateArrivalRef = useRef(false);

  useEffect(() => {
    onArrivalEventsRef.current = onArrivalEvents;
  }, [onArrivalEvents]);

  const processSample = useCallback(
    (sample: AcceptedLocationSample | null, now = Date.now()) => {
      const evaluation = evaluateArrivalSession({
        previousState: sessionRef.current,
        sample,
        store,
        visit,
        workdayActive,
        config,
        now,
        simulateConfirmedArrival: simulateArrivalRef.current,
      });

      sessionRef.current = evaluation.state;

      if (evaluation.events.length > 0) {
        logArrivalEvents(evaluation.events);
        onArrivalEventsRef.current?.(evaluation.events, evaluation.state);
      }

      const nextResult = buildResult(evaluation, simulateArrivalRef.current);

      setResult((previous) => {
        if (
          previous.hasArrived === nextResult.hasArrived &&
          previous.arrivalStatus === nextResult.arrivalStatus &&
          previous.distanceMeters === nextResult.distanceMeters &&
          previous.accuracyMeters === nextResult.accuracyMeters &&
          previous.dwellRemainingMs === nextResult.dwellRemainingMs &&
          previous.isSimulated === nextResult.isSimulated &&
          previous.rejectionReason === nextResult.rejectionReason
        ) {
          return previous;
        }

        return nextResult;
      });

      void refreshWorkdayCoordinatorFromPersistence({
        action: 'arrivalStateChange',
        hasArrived: evaluation.hasArrived,
        completionPhase: 'idle',
      });
    },
    [config, store, visit, workdayActive],
  );

  const refreshSimulatedArrival = useCallback(async () => {
    simulateArrivalRef.current = await getDevSimulateArrival();
    processSample(getLatestWorkdayLocationSample(), Date.now());
  }, [processSample]);

  const refreshFallbackLocation = useCallback(async () => {
    if (!foregroundScreenActive || !store) {
      return;
    }

    if (isWorkdayLocationStreamActive()) {
      processSample(getLatestWorkdayLocationSample(), Date.now());
      return;
    }

    const oneTime = await getOneTimeLocationFix({
      preferAccumulatorPosition: getLastAccumulatorPosition,
    });

    if (!oneTime.ok) {
      processSample(null, Date.now());
      return;
    }

    processSample(toAcceptedLocationSample(oneTime.update), Date.now());
  }, [foregroundScreenActive, processSample, store]);

  useEffect(() => {
    sessionRef.current = createInitialArrivalSessionState();
    setResult(EMPTY_RESULT);
    void refreshSimulatedArrival();
  }, [visit?.id, store?.id, refreshSimulatedArrival]);

  useEffect(() => {
    void refreshSimulatedArrival();
  }, [refreshSimulatedArrival]);

  useEffect(() => {
    const unsubscribe = subscribeToWorkdayLocationSamples((sample) => {
      void refreshSimulatedArrival().then(() => {
        processSample(sample, Date.now());
      });
    });

    const latest = getLatestWorkdayLocationSample();

    if (latest) {
      void refreshSimulatedArrival().then(() => {
        processSample(latest, Date.now());
      });
    }

    return unsubscribe;
  }, [processSample, refreshSimulatedArrival]);

  useEffect(() => {
    if (!foregroundScreenActive || !store) {
      return;
    }

    void refreshFallbackLocation();

    const intervalId = setInterval(() => {
      void refreshFallbackLocation();
    }, FALLBACK_LOCATION_POLL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [foregroundScreenActive, refreshFallbackLocation, store]);

  return result;
}

export function isArrivalForegroundScreen(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/(tabs)') ||
    pathname.startsWith('/store/')
  );
}
