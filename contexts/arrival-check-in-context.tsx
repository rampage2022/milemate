import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'expo-router';

import {
  AutoCheckInConfirmationBanner,
  type AutoCheckInConfirmationToast,
} from '@/components/auto-check-in-confirmation-banner';
import { useVisitAdvancement } from '@/contexts/visit-advancement-context';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import { useStoreArrival, isArrivalForegroundScreen } from '@/hooks/use-store-arrival';
import { fireAutoCheckInConfirmationFeedback } from '@/services/auto-check-in-confirmation-ui';
import { presentAutomaticCheckInNotification } from '@/services/check-in-local-notification';
import { getActiveTrip } from '@/services/active-trip';
import {
  logArrivalDevEvent,
  markAutomaticCheckInHandled,
  performAutomaticCheckIn,
  resetAutomaticCheckInSessionState,
} from '@/services/arrival-check-in';
import { getStoreById } from '@/services/stores';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import {
  checkInVisit,
  getTodayVisits,
  resolveCurrentVisit,
} from '@/services/store-visits';
import { getAutoCheckInMode } from '@/services/workflow-preferences';
import type { AutoCheckInMode } from '@/types/auto-check-in';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { markArrivalSessionHandled } from '@/utils/arrival-evaluator';
import type { ArrivalEvent, ArrivalSessionState } from '@/types/arrival-session';
import {
  autoCheckInConfirmationTracker,
  isTodayCoordinatorScreen,
  logAutoCheckInConfirmationDev,
} from '@/utils/auto-check-in-confirmation';

type ArrivalCheckInContextValue = {
  hasArrived: boolean;
  arrivalStatus: ReturnType<typeof useStoreArrival>['arrivalStatus'];
  distanceMeters: number | null;
  distanceMiles: number | null;
  estimatedEtaMinutes: number | null;
  accuracyMeters: number | null;
  dwellRemainingMs: number | null;
  isSimulated: boolean;
  rejectionReason: ReturnType<typeof useStoreArrival>['rejectionReason'];
  autoCheckInMode: AutoCheckInMode;
  showAskPrompt: boolean;
  isAutomaticCheckInPending: boolean;
  handleAskCheckIn: () => Promise<void>;
  refreshRouteContext: () => Promise<void>;
};

const ArrivalCheckInContext = createContext<ArrivalCheckInContextValue | null>(
  null,
);

export function ArrivalCheckInProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isWorkdayActive } = useWorkdayTrackerContext();
  const { requestRouteRefresh, routeRefreshNonce } = useVisitAdvancement();
  const [currentVisit, setCurrentVisit] = useState<StoreVisit | null>(null);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [autoCheckInMode, setAutoCheckInMode] =
    useState<AutoCheckInMode>('ask');
  const [showAskPrompt, setShowAskPrompt] = useState(false);
  const [isAutomaticCheckInPending, setIsAutomaticCheckInPending] =
    useState(false);
  const [confirmationToast, setConfirmationToast] =
    useState<AutoCheckInConfirmationToast | null>(null);
  const handledArrivalVisitIdRef = useRef<string | null>(null);
  const sessionStateRef = useRef<ArrivalSessionState | null>(null);

  const refreshRouteContext = useCallback(async () => {
    const [visits, mode] = await Promise.all([
      getTodayVisits(),
      getAutoCheckInMode(),
    ]);
    const visit = resolveCurrentVisit(visits);
    const store = visit ? await getStoreById(visit.storeId) : null;

    setCurrentVisit(visit);
    setCurrentStore(store);
    setAutoCheckInMode(mode);
  }, []);

  useEffect(() => {
    void refreshRouteContext();
  }, [refreshRouteContext, routeRefreshNonce, isWorkdayActive, pathname]);

  useEffect(() => {
    if (!isWorkdayActive) {
      resetAutomaticCheckInSessionState();
      handledArrivalVisitIdRef.current = null;
      setShowAskPrompt(false);
      setIsAutomaticCheckInPending(false);
      setConfirmationToast(null);
    }
  }, [isWorkdayActive]);

  const presentAutomaticCheckInConfirmation = useCallback(
    (visit: StoreVisit, store: Store) => {
      if (
        visit.checkInSource !== 'automatic' ||
        typeof visit.checkedInAt !== 'number'
      ) {
        return;
      }

      logAutoCheckInConfirmationDev('auto check-in success observed', {
        visitId: visit.id,
        checkedInAt: visit.checkedInAt,
      });

      const decision = autoCheckInConfirmationTracker.evaluateConfirmation({
        visitId: visit.id,
        checkedInAt: visit.checkedInAt,
        checkInSource: visit.checkInSource,
      });

      if (decision !== 'show') {
        return;
      }

      fireAutoCheckInConfirmationFeedback();

      const storeLabel = getStoreDisplayName(store);
      const numberedLabel = store.storeNumber?.trim()
        ? `${storeLabel} #${store.storeNumber.trim()}`
        : storeLabel;

      setConfirmationToast({
        visitId: visit.id,
        storeName: numberedLabel,
        stopNumber: visit.routeOrder,
        checkedInAt: visit.checkedInAt,
      });

      void (async () => {
        const activeTrip = await getActiveTrip();
        const workdayId = activeTrip?.id ?? visit.tripId ?? visit.scheduledDate;

        await presentAutomaticCheckInNotification({
          checkedInAt: visit.checkedInAt!,
          stopId: visit.id,
          storeId: visit.storeId,
          storeName: numberedLabel,
          workdayId,
        });
      })();
    },
    [],
  );

  const handleArrivalConfirmed = useCallback(
    async (visit: StoreVisit, store: Store, mode: AutoCheckInMode) => {
      if (handledArrivalVisitIdRef.current === visit.id) {
        return;
      }

      handledArrivalVisitIdRef.current = visit.id;

      if (mode === 'automatic') {
        setIsAutomaticCheckInPending(true);
        logArrivalDevEvent('automatic check-in started');

        const updatedVisit = await performAutomaticCheckIn(visit.id);

        setIsAutomaticCheckInPending(false);

        if (updatedVisit?.checkInSource === 'automatic') {
          logArrivalDevEvent('automatic check-in completed');
          markAutomaticCheckInHandled(visit.id);
          setShowAskPrompt(false);

          presentAutomaticCheckInConfirmation(updatedVisit, store);

          await refreshRouteContext();
          requestRouteRefresh();
        }

        return;
      }

      if (mode === 'ask') {
        setShowAskPrompt(true);
        markAutomaticCheckInHandled(visit.id);
        return;
      }

      markAutomaticCheckInHandled(visit.id);
    },
    [presentAutomaticCheckInConfirmation, refreshRouteContext, requestRouteRefresh],
  );

  const onArrivalEvents = useCallback(
    (events: ArrivalEvent[], state: ArrivalSessionState) => {
      sessionStateRef.current = state;

      if (!currentVisit || !currentStore) {
        return;
      }

      for (const event of events) {
        if (event.type !== 'arrival_confirmed') {
          continue;
        }

        if (
          currentVisit.status !== 'pending' &&
          currentVisit.status !== 'current'
        ) {
          return;
        }

        void handleArrivalConfirmed(currentVisit, currentStore, autoCheckInMode);
      }
    },
    [autoCheckInMode, currentStore, currentVisit, handleArrivalConfirmed],
  );

  const arrival = useStoreArrival({
    store: currentStore,
    visit: currentVisit,
    workdayActive: isWorkdayActive,
    foregroundScreenActive: isArrivalForegroundScreen(pathname),
    onArrivalEvents,
  });

  useEffect(() => {
    if (
      currentVisit &&
      (currentVisit.status === 'checked_in' ||
        currentVisit.status === 'completed' ||
        currentVisit.status === 'skipped')
    ) {
      setShowAskPrompt(false);
      setIsAutomaticCheckInPending(false);
    }
  }, [currentVisit]);

  const handleAskCheckIn = useCallback(async () => {
    if (!currentVisit) {
      return;
    }

    await checkInVisit(currentVisit.id, { source: 'manual' });
    setShowAskPrompt(false);
    handledArrivalVisitIdRef.current = currentVisit.id;

    if (sessionStateRef.current) {
      sessionStateRef.current = markArrivalSessionHandled(
        sessionStateRef.current,
        Date.now(),
      );
    }

    await refreshRouteContext();
    requestRouteRefresh();
  }, [currentVisit, refreshRouteContext, requestRouteRefresh]);

  const dismissConfirmationToast = useCallback(() => {
    setConfirmationToast(null);
  }, []);

  const value: ArrivalCheckInContextValue = {
    hasArrived: arrival.hasArrived,
    arrivalStatus: arrival.arrivalStatus,
    distanceMeters: arrival.distanceMeters,
    distanceMiles: arrival.distanceMiles,
    estimatedEtaMinutes: arrival.estimatedEtaMinutes,
    accuracyMeters: arrival.accuracyMeters,
    dwellRemainingMs: arrival.dwellRemainingMs,
    isSimulated: arrival.isSimulated,
    rejectionReason: arrival.rejectionReason,
    autoCheckInMode,
    showAskPrompt:
      showAskPrompt &&
      autoCheckInMode === 'ask' &&
      arrival.hasArrived &&
      currentVisit !== null &&
      (currentVisit.status === 'pending' || currentVisit.status === 'current'),
    isAutomaticCheckInPending,
    handleAskCheckIn,
    refreshRouteContext,
  };

  return (
    <ArrivalCheckInContext.Provider value={value}>
      {children}
      <AutoCheckInConfirmationBanner
        onDismissed={dismissConfirmationToast}
        toast={confirmationToast}
        visible={
          confirmationToast !== null && isTodayCoordinatorScreen(pathname)
        }
      />
    </ArrivalCheckInContext.Provider>
  );
}

export function useArrivalCheckIn(): ArrivalCheckInContextValue {
  const context = useContext(ArrivalCheckInContext);

  if (!context) {
    throw new Error(
      'useArrivalCheckIn must be used within ArrivalCheckInProvider',
    );
  }

  return context;
}
