import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { AfterCompletionSheet } from '@/components/today/after-completion-sheet';
import { VisitCompletionOverlay } from '@/components/today/visit-completion-overlay';
import {
  clearPendingVisitAdvancement,
  getPendingVisitAdvancement,
  savePendingVisitAdvancement,
  type PendingVisitAdvancement,
} from '@/services/pending-advancement';
import { getStoreById } from '@/services/stores';
import {
  applyVisitPromotion,
  completeVisit,
  getTodayVisits,
  undoVisitAdvancement,
  type CompleteVisitResult,
} from '@/services/store-visits';
import {
  getRouteCompletedAtForToday,
  recordRouteCompletedAt,
} from '@/services/route-session-timing';
import { getActiveTrip } from '@/services/active-trip';
import { getAuthoritativeDistanceMiles } from '@/services/workday-distance-accumulator';
import { isRouteFullyResolved } from '@/utils/route-resolution';
import type { AfterCompletionMode } from '@/types/after-completion';
import { openStoreDirectionsSafely } from '@/utils/store-navigation';
import {
  onVisitCompletionPhaseChange,
  onVisitCompletionUndone,
  onVisitPromoted,
} from '@/services/workday-coordinator-integration';
import { getTodayDateString } from '@/utils/today-date';

const COUNTDOWN_SECONDS = 3;
const CARD_TRANSITION_MS = 250;
const OVERLAY_FADE_OUT_MS = 250;

function logVisitCompletionDev(
  step:
    | 'completion started'
    | 'visit persisted'
    | 'pending advancement persisted'
    | 'pending state applied'
    | 'route refresh triggered'
    | 'countdown started'
    | 'promotion persisted'
    | 'final refresh triggered',
  detail?: Record<string, unknown>,
): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  if (detail) {
    console.log(`[VisitCompletion] ${step}`, detail);
  } else {
    console.log(`[VisitCompletion] ${step}`);
  }
}

type CompletionPhase =
  | 'idle'
  | 'countdown'
  | 'transitioning'
  | 'all_complete'
  | 'ask_sheet';

export type { CompletionPhase };

type BeginCompletionInput = {
  visitId: string;
  completedStoreId: string;
  completedStoreName: string;
};

type VisitAdvancementContextValue = {
  phase: CompletionPhase;
  pendingAdvancement: PendingVisitAdvancement | null;
  routeRefreshNonce: number;
  isCompletionActive: boolean;
  cardTransitionActive: boolean;
  completionCountdownSeconds: number | null;
  beginVisitCompletion: (input: BeginCompletionInput) => Promise<boolean>;
  continueToNextStop: () => void;
  undoCompletion: () => Promise<void>;
  dismissAskSheet: (openDirections: boolean) => void;
  dismissRouteCompletePhase: () => void;
  enterRouteCompletePhase: () => Promise<void>;
  routeCompleteCelebrationKey: number;
  reloadPendingAdvancement: () => Promise<void>;
  requestRouteRefresh: () => void;
};

const VisitAdvancementContext = createContext<VisitAdvancementContextValue | null>(
  null,
);

function clearIntervalTimer(
  timerRef: { current: ReturnType<typeof setInterval> | null },
) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

function clearTimeoutTimer(
  timerRef: { current: ReturnType<typeof setTimeout> | null },
) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

export function VisitAdvancementProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<CompletionPhase>('idle');
  const [pendingAdvancement, setPendingAdvancement] =
    useState<PendingVisitAdvancement | null>(null);
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_SECONDS);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayVariant, setOverlayVariant] = useState<
    'countdown' | 'workday_complete'
  >('countdown');
  const [completedStoreName, setCompletedStoreName] = useState<string | null>(
    null,
  );
  const [nextStoreName, setNextStoreName] = useState<string | null>(null);
  const [afterCompletionMode, setAfterCompletionMode] =
    useState<AfterCompletionMode>('open_directions');
  const [askSheetVisible, setAskSheetVisible] = useState(false);
  const [askSheetStoreName, setAskSheetStoreName] = useState('');
  const [routeRefreshNonce, setRouteRefreshNonce] = useState(0);
  const [cardTransitionActive, setCardTransitionActive] = useState(false);
  const [routeCompleteCelebrationKey, setRouteCompleteCelebrationKey] = useState(0);

  const activePendingRef = useRef<PendingVisitAdvancement | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const promotionInFlightRef = useRef(false);
  const promotedStoreRef = useRef<{ id: string; name: string } | null>(null);

  const bumpRouteRefresh = useCallback(() => {
    setRouteRefreshNonce((value) => value + 1);
  }, []);

  const activateRouteCompletePhase = useCallback(async () => {
    const visits = await getTodayVisits();

    if (!isRouteFullyResolved(visits)) {
      console.warn(
        '[VisitCompletion] Route complete blocked — unresolved stops remain',
      );
      return;
    }

    const existingCompletedAt = await getRouteCompletedAtForToday();
    const activeTrip = await getActiveTrip();
    const distanceMilesAtCompletion =
      activeTrip && activeTrip.endedAt === undefined
        ? activeTrip.distanceMiles ?? getAuthoritativeDistanceMiles()
        : undefined;

    if (!existingCompletedAt) {
      await recordRouteCompletedAt(Date.now(), {
        distanceMilesAtCompletion,
      });
    }

    setRouteCompleteCelebrationKey((current) => current + 1);
    setPhase('all_complete');
  }, []);

  const clearAutomationTimers = useCallback(() => {
    clearIntervalTimer(countdownTimerRef);
    clearTimeoutTimer(dismissTimerRef);
    clearTimeoutTimer(transitionTimerRef);
  }, []);

  const hideOverlay = useCallback(() => {
    setOverlayVisible(false);
    setOverlayVariant('countdown');
    setCountdownValue(COUNTDOWN_SECONDS);
  }, []);

  const loadPendingAdvancement = useCallback(async () => {
    const pending = await getPendingVisitAdvancement();
    setPendingAdvancement(pending);
    activePendingRef.current = pending;
  }, []);

  const cancelAutomation = useCallback(() => {
    cancelledRef.current = true;
    promotionInFlightRef.current = false;
    clearAutomationTimers();
    hideOverlay();
    setPhase('idle');
    setCardTransitionActive(false);
    setAskSheetVisible(false);
  }, [clearAutomationTimers, hideOverlay]);

  const runAfterCompletion = useCallback(
    async (mode: AfterCompletionMode, nextStoreId: string) => {
      if (cancelledRef.current) {
        return;
      }

      const store = await getStoreById(nextStoreId);

      if (!store) {
        return;
      }

      if (mode === 'open_directions') {
        openStoreDirectionsSafely(store);
        return;
      }

      if (mode === 'ask') {
        setAskSheetStoreName(store.name);
        setAskSheetVisible(true);
        setPhase('ask_sheet');
      }
    },
    [],
  );

  const finishPromotionFlow = useCallback(async () => {
    if (promotionInFlightRef.current) {
      return;
    }

    promotionInFlightRef.current = true;
    const pending = activePendingRef.current;

    if (!pending || cancelledRef.current) {
      promotionInFlightRef.current = false;
      cancelAutomation();
      return;
    }

    setPhase('transitioning');
    setCardTransitionActive(true);

    await applyVisitPromotion(pending.snapshot);

    logVisitCompletionDev('promotion persisted', {
      nextVisitId: pending.nextVisitId,
    });

    await clearPendingVisitAdvancement();
    setPendingAdvancement(null);

    void onVisitPromoted();

    const promotedStore = await getStoreById(pending.nextStoreId);
    promotedStoreRef.current = promotedStore
      ? { id: promotedStore.id, name: promotedStore.name }
      : { id: pending.nextStoreId, name: pending.nextStoreName };

    bumpRouteRefresh();

    logVisitCompletionDev('final refresh triggered');

    transitionTimerRef.current = setTimeout(() => {
      setCardTransitionActive(false);
      hideOverlay();

      transitionTimerRef.current = setTimeout(() => {
        void (async () => {
          if (cancelledRef.current) {
            setPhase('idle');
            return;
          }

          activePendingRef.current = null;
          setPhase('idle');
          promotionInFlightRef.current = false;

          if (promotedStoreRef.current) {
            await runAfterCompletion(
              pending.afterCompletionMode,
              promotedStoreRef.current.id,
            );
          }
        })();
      }, OVERLAY_FADE_OUT_MS);
    }, CARD_TRANSITION_MS);
  }, [
    bumpRouteRefresh,
    cancelAutomation,
    hideOverlay,
    runAfterCompletion,
  ]);

  const applyPendingAdvancementState = useCallback(
    (pending: PendingVisitAdvancement) => {
      activePendingRef.current = pending;
      setPendingAdvancement(pending);
      setCompletedStoreName(pending.completedStoreName);
      setNextStoreName(pending.nextStoreName);
      setAfterCompletionMode(pending.afterCompletionMode);
      logVisitCompletionDev('pending state applied', {
        completedVisitId: pending.completedVisitId,
        nextVisitId: pending.nextVisitId,
      });
    },
    [],
  );

  const startCountdownVisual = useCallback(() => {
    cancelledRef.current = false;
    setOverlayVariant('countdown');
    setOverlayVisible(true);
    setPhase('countdown');
    setCountdownValue(COUNTDOWN_SECONDS);

    clearAutomationTimers();

    logVisitCompletionDev('countdown started');

    countdownTimerRef.current = setInterval(() => {
      setCountdownValue((current) => {
        if (current <= 1) {
          clearIntervalTimer(countdownTimerRef);
          void finishPromotionFlow();
          return 0;
        }

        return current - 1;
      });
    }, 1000);
  }, [clearAutomationTimers, finishPromotionFlow]);

  const beginVisitCompletion = useCallback(
    async ({
      visitId,
      completedStoreId,
      completedStoreName: completedName,
    }: BeginCompletionInput): Promise<boolean> => {
      if (phase !== 'idle' && phase !== 'ask_sheet') {
        return false;
      }

      logVisitCompletionDev('completion started', { visitId });

      const result: CompleteVisitResult | null = await completeVisit(visitId);

      if (!result) {
        return false;
      }

      logVisitCompletionDev('visit persisted', {
        visitId,
        hasNextStop: result.hasNextStop,
      });

      if (!result.hasNextStop) {
        setCompletedStoreName(completedName);
        await activateRouteCompletePhase();
        bumpRouteRefresh();
        logVisitCompletionDev('route refresh triggered', { reason: 'route_complete' });

        return true;
      }

      if (!result.nextVisitId || !result.nextStoreId) {
        console.error('[VisitCompletion] Missing next stop after completion');
        return false;
      }

      const pending: PendingVisitAdvancement = {
        scheduledDate: getTodayDateString(),
        completedVisitId: visitId,
        completedStoreId,
        completedStoreName: completedName,
        nextVisitId: result.nextVisitId,
        nextStoreId: result.nextStoreId,
        nextStoreName: result.nextStoreName ?? 'Next store',
        afterCompletionMode: result.afterCompletionMode,
        snapshot: result.snapshot,
      };

      await savePendingVisitAdvancement(pending);

      logVisitCompletionDev('pending advancement persisted', {
        completedVisitId: pending.completedVisitId,
        nextVisitId: pending.nextVisitId,
      });

      applyPendingAdvancementState(pending);
      bumpRouteRefresh();
      logVisitCompletionDev('route refresh triggered', { reason: 'pending_ready' });
      startCountdownVisual();

      return true;
    },
    [
      activateRouteCompletePhase,
      applyPendingAdvancementState,
      bumpRouteRefresh,
      phase,
      startCountdownVisual,
    ],
  );

  const enterRouteCompletePhase = useCallback(async () => {
    if (phase !== 'idle' && phase !== 'all_complete') {
      return;
    }

    await activateRouteCompletePhase();
  }, [activateRouteCompletePhase, phase]);

  const continueToNextStop = useCallback(() => {
    const pending = activePendingRef.current ?? pendingAdvancement;

    if (!pending || phase !== 'idle') {
      return;
    }

    applyPendingAdvancementState(pending);
    startCountdownVisual();
  }, [applyPendingAdvancementState, pendingAdvancement, phase, startCountdownVisual]);

  const undoCompletion = useCallback(async () => {
    const pending = activePendingRef.current ?? pendingAdvancement;

    cancelledRef.current = true;
    promotionInFlightRef.current = false;
    clearAutomationTimers();
    hideOverlay();
    setAskSheetVisible(false);
    setCardTransitionActive(false);
    setPhase('idle');

    if (!pending) {
      return;
    }

    try {
      await undoVisitAdvancement(pending.snapshot);
      await clearPendingVisitAdvancement();
      activePendingRef.current = null;
      setPendingAdvancement(null);
      bumpRouteRefresh();
      void onVisitCompletionUndone();
    } catch (error) {
      console.error('[VisitCompletion] undo failed:', error);
    }
  }, [
    bumpRouteRefresh,
    clearAutomationTimers,
    hideOverlay,
    pendingAdvancement,
  ]);

  const dismissRouteCompletePhase = useCallback(() => {
    clearTimeoutTimer(dismissTimerRef);
    setCompletedStoreName(null);
    setPhase('idle');
  }, []);

  const dismissAskSheet = useCallback(
    (openDirections: boolean) => {
      setAskSheetVisible(false);
      setPhase('idle');

      if (openDirections && promotedStoreRef.current) {
        void getStoreById(promotedStoreRef.current.id).then((store) => {
          if (store) {
            openStoreDirectionsSafely(store);
          }
        });
      }
    },
    [],
  );

  useEffect(() => {
    void loadPendingAdvancement();
  }, [loadPendingAdvancement]);

  useEffect(() => {
    void onVisitCompletionPhaseChange(phase, 'completionPhaseChange');
  }, [phase, pendingAdvancement, routeRefreshNonce]);

  useEffect(() => {
    return () => {
      clearAutomationTimers();
    };
  }, [clearAutomationTimers]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        return;
      }

      if (phase === 'countdown' || phase === 'transitioning') {
        cancelAutomation();
      }

      if (phase === 'all_complete') {
        return;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [cancelAutomation, hideOverlay, phase]);

  const isCompletionActive =
    phase === 'countdown' || phase === 'transitioning' || phase === 'all_complete';

  const completionCountdownSeconds =
    phase === 'countdown' && countdownValue > 0 ? countdownValue : null;

  return (
    <VisitAdvancementContext.Provider
      value={{
        phase,
        pendingAdvancement,
        routeRefreshNonce,
        isCompletionActive,
        cardTransitionActive,
        completionCountdownSeconds,
        beginVisitCompletion,
        continueToNextStop,
        undoCompletion,
        dismissAskSheet,
        dismissRouteCompletePhase,
        enterRouteCompletePhase,
        reloadPendingAdvancement: loadPendingAdvancement,
        requestRouteRefresh: bumpRouteRefresh,
        routeCompleteCelebrationKey,
      }}
    >
      {children}
      <VisitCompletionOverlay
        afterCompletionMode={afterCompletionMode}
        countdownValue={countdownValue}
        nextStoreName={nextStoreName}
        onUndo={() => {
          void undoCompletion();
        }}
        variant={overlayVariant}
        visible={overlayVisible}
      />
      <AfterCompletionSheet
        onOpenDirections={() => {
          dismissAskSheet(true);
        }}
        onStayInApp={() => {
          dismissAskSheet(false);
        }}
        storeName={askSheetStoreName}
        visible={askSheetVisible}
      />
    </VisitAdvancementContext.Provider>
  );
}

export function useVisitAdvancement(): VisitAdvancementContextValue {
  const context = useContext(VisitAdvancementContext);

  if (!context) {
    throw new Error(
      'useVisitAdvancement must be used within VisitAdvancementProvider',
    );
  }

  return context;
}

/** @deprecated Use beginVisitCompletion */
export type LegacyBeginAdvancement = never;
