import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { workdayDockTotalHeight } from '@/components/navigation/workday-dock';

import { AddStopScreen } from '@/components/add-stop/add-stop-screen';
import { CoordinatorPlanningScreen } from '@/components/coordinator/coordinator-planning-screen';
import { CoordinatorLiveRouteScreen } from '@/components/coordinator/coordinator-live-route-screen';
import { HomeIdleScreen } from '@/components/home/home-idle-screen';
import { HomeLayout } from '@/components/home/home-layout';
import { SavedRoutesSheet } from '@/components/coordinator/saved-routes-sheet';
import { RouteCompleteScreen } from '@/components/coordinator/route-complete-screen';
import { PlanningRouteDock } from '@/components/coordinator/planning-route-dock';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { WorkdayPreviewScreen } from '@/components/coordinator/workday-preview-screen';
import { RouteCalculationTransition } from '@/components/coordinator/route-calculation-transition';
import { HomeHeader } from '@/components/home/home-header';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import { WorkdayCompleteCard } from '@/components/today/workday-complete-card';
import { useRouteEditSession } from '@/contexts/route-edit-session-context';
import { useVisitAdvancement } from '@/contexts/visit-advancement-context';
import { useWorkdayNavigation } from '@/contexts/workday-navigation-context';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import { useMyLocations } from '@/hooks/use-my-locations';
import { usePlanningRouteSummary } from '@/hooks/use-planning-route-summary';
import { useRoutePlanning } from '@/hooks/use-route-planning';
import { useTodayRouteSelection } from '@/hooks/use-today-route-selection';
import { useTodayRoute } from '@/hooks/use-today-route';
import { getActiveTrip, saveActiveTrip } from '@/services/active-trip';
import { clearRouteSessionTimingForToday } from '@/services/route-session-timing';
import { clearPendingVisitAdvancement } from '@/services/pending-advancement';
import { refreshWorkdayCoordinatorFromPersistence } from '@/services/workday-coordinator-integration';
import {
  applyMakeFirst,
  applyMakeNext,
  applyRemoveFromToday,
  applyRouteReorder,
  finalizeActiveWorkdayAfterStopAdded,
} from '@/services/route-edit-commands';
import {
  addExistingStoresToTodayRoute,
  addManualStopToTodayRoute,
  calculateTodayRoute,
  clearTodayRouteStops,
  type RouteCalculationStep,
} from '@/services/route-calculation';
import { getEffectiveEndLocation } from '@/services/route-planning';
import { useDynamicEstimatedFinishAt } from '@/hooks/use-dynamic-estimated-finish';
import {
  attachTripIdToTodayVisits,
  checkInVisit,
  prepareVisitsForWorkdayRoutePlanning,
  replaceTodayVisits,
  startTodayRoute,
  undoActiveCheckIn,
} from '@/services/store-visits';
import { isTodayRouteStarted } from '@/utils/today-route-start';
import type { StoreVisit } from '@/types/store-visit';
import {
  applySavedRouteToToday,
  ensureDefaultSavedRoutes,
  getSavedRoutes,
} from '@/services/saved-routes';
import { countFinishedVisits } from '@/utils/pre-day-briefing';
import { shouldShowPlanningRouteDock } from '@/utils/coordinator-screen-presentation';
import { buildBriefingPresentation } from '@/utils/briefing-presentation';
import {
  buildDailyBriefingSummary,
  resolveCoordinatorScreenMode,
} from '@/utils/planned-route-briefing';
import {
  buildActiveRouteContextFromPlanningDraft,
  syncPlanningDraftToTodayRouteSelection,
} from '@/utils/planning-route-sync';
import { formatTodayHeading } from '@/utils/today-date';
import { useGestureInteractionCleanup } from '@/hooks/use-gesture-interaction-cleanup';
import { resetRoutePlanningForNewRoute } from '@/services/route-planning-reset';
import { shouldShowRouteEntryLauncher } from '@/utils/route-tab-experience';
import { getStartLocation, hasVisitStops } from '@/utils/route-state';
import type { RouteLocation } from '@/types/route-location';
import { subscribeDevResetHome } from '@/utils/dev-reset-home-signal';
import type { SavedRoute } from '@/types/saved-route';
import { prepareStartDayLocationRequirements } from '@/services/start-day-flow';

/** Temporarily hidden while route summary and optimization UX are being redesigned. */
const ROUTE_PLANNING_DOCK_UI_ENABLED = false;

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useGestureInteractionCleanup('Today');
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ComponentRef<typeof NestableScrollContainer>>(null);
  const buildRouteAddStopAnchorRef = useRef<View>(null);
  const mapSectionRef = useRef<View>(null);
  const scrollContentRef = useRef<View>(null);
  const {
    focusScrollTarget,
    liveRouteViewMode,
    mode: navigationMode,
    registerHandlers,
    requestScrollTo,
    setPreWorkdayTabBarHidden,
  } = useWorkdayNavigation();
  const {
    continueToNextStop,
    dismissRouteCompletePhase,
    enterRouteCompletePhase,
    routeCompleteCelebrationKey,
    phase: visitCompletionPhase,
    requestRouteRefresh,
  } = useVisitAdvancement();
  const { enterRouteEdit } = useRouteEditSession();
  const [finishWorkdayError, setFinishWorkdayError] = useState<string | null>(null);
  const [isFinishingWorkday, setIsFinishingWorkday] = useState(false);
  const [isStartingDay, setIsStartingDay] = useState(false);
  const [startDayError, setStartDayError] = useState<string | null>(null);
  const startDayInFlightRef = useRef(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [activeCalculationStep, setActiveCalculationStep] =
    useState<RouteCalculationStep | null>(null);
  const [completedCalculationSteps, setCompletedCalculationSteps] = useState<
    RouteCalculationStep[]
  >([]);
  const [isPlanningAddressEntryActive, setIsPlanningAddressEntryActive] =
    useState(false);
  const [isAddingStopsDuringWorkday, setIsAddingStopsDuringWorkday] =
    useState(false);
  const [activeWorkdayAddStopVisible, setActiveWorkdayAddStopVisible] =
    useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [routePlanningSessionOpen, setRoutePlanningSessionOpen] = useState(false);
  const [showSavedRoutesSheet, setShowSavedRoutesSheet] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [dockedSummaryHeight, setDockedSummaryHeight] = useState<number>(
    PlanningLayout.planningRouteDockEstimatedHeight,
  );
  const {
    endWorkday,
    isRestoring,
    isWorkdayActive,
    permissionDenied,
    startWorkday,
  } = useWorkdayTrackerContext();
  const {
    current,
    isLoading,
    next,
    refresh,
    showContinueToNext,
    storesById,
    totalCount,
    visits,
  } = useTodayRoute();
  const { locations: myLocations } = useMyLocations();
  const {
    backToPlanning,
    completeCalculation,
    draft: planningDraft,
    isLoading: isPlanningLoading,
    refresh: refreshPlanningDraft,
    setPhase,
    updateLocations,
  } = useRoutePlanning(myLocations);
  const { selection: todayRouteSelection } = useTodayRouteSelection();

  const screenMode = resolveCoordinatorScreenMode({
    isRestoring,
    isLoading: (isLoading || isPlanningLoading) && !isWorkdayActive,
    isWorkdayActive,
    isEditingRouteDuringWorkday: isAddingStopsDuringWorkday,
    visits,
    planningPhase: planningDraft.phase,
  });

  const showRouteEntryLauncher = shouldShowRouteEntryLauncher({
    isAddingStopsDuringWorkday,
    isLoading: isLoading || isPlanningLoading,
    isRestoring,
    isWorkdayActive,
    planningPhase: planningDraft.phase,
    routePlanningSessionOpen,
    visits,
  });

  const showRoutePlanningCanvas =
    !showRouteEntryLauncher &&
    (screenMode === 'planning' || isAddingStopsDuringWorkday);

  const showBuildRoutePlanningShell =
    showRoutePlanningCanvas &&
    planningDraft.phase === 'planning' &&
    !isWorkdayActive;

  const previousBuildRouteVisitCountRef = useRef(visits.length);

  useEffect(() => {
    const previousCount = previousBuildRouteVisitCountRef.current;
    previousBuildRouteVisitCountRef.current = visits.length;

    if (!showBuildRoutePlanningShell || visits.length <= previousCount) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (!buildRouteAddStopAnchorRef.current || !scrollContentRef.current) {
        return;
      }

      buildRouteAddStopAnchorRef.current.measureLayout(
        scrollContentRef.current,
        (_x, y) => {
          scrollRef.current?.scrollTo({
            animated: true,
            y: Math.max(0, y - 16),
          });
        },
        () => {},
      );
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [showBuildRoutePlanningShell, visits.length]);

  useEffect(() => {
    const hideTabs = screenMode === 'briefing';

    setPreWorkdayTabBarHidden(hideTabs);
  }, [screenMode, setPreWorkdayTabBarHidden]);

  useEffect(() => {
    return subscribeDevResetHome(() => {
      setRoutePlanningSessionOpen(false);
      setIsAddingStopsDuringWorkday(false);
      setIsCalculatingRoute(false);
      setCalculationError(null);
      setActiveCalculationStep(null);
      setCompletedCalculationSteps([]);
      dismissRouteCompletePhase();
      scrollRef.current?.scrollTo({ animated: false, y: 0 });
      void refresh();
      void refreshPlanningDraft();
    });
  }, [
    dismissRouteCompletePhase,
    refresh,
    refreshPlanningDraft,
  ]);

  useEffect(() => {
    if (showRouteEntryLauncher) {
      setRoutePlanningSessionOpen(false);
    }
  }, [showRouteEntryLauncher]);

  useEffect(() => {
    if (hasVisitStops(visits)) {
      setRoutePlanningSessionOpen(true);
    }
  }, [visits]);

  useEffect(() => {
    if (!showRouteEntryLauncher || isWorkdayActive) {
      return;
    }

    if (planningDraft.phase === 'briefing') {
      void backToPlanning().then(() => refreshPlanningDraft());
    }
  }, [
    backToPlanning,
    isWorkdayActive,
    planningDraft.phase,
    refreshPlanningDraft,
    showRouteEntryLauncher,
  ]);

  const endLocation = useMemo(
    () => getEffectiveEndLocation(planningDraft),
    [planningDraft],
  );

  const endStore = useMemo(() => {
    if (!endLocation) {
      return null;
    }

    return (
      Object.values(storesById).find(
        (store) =>
          store.latitude === endLocation.latitude &&
          store.longitude === endLocation.longitude,
      ) ?? null
    );
  }, [endLocation, storesById]);

  const dynamicEstimatedFinishAt = useDynamicEstimatedFinishAt({
    enabled: screenMode === 'active_workday',
    visits,
    storesById,
    currentVisit: current?.visit ?? null,
    endStore,
  });

  const briefingSummary = useMemo(
    () =>
      buildDailyBriefingSummary({
        draft: planningDraft,
        visits,
        storesById,
        dateHeading: formatTodayHeading(),
      }),
    [planningDraft, storesById, visits],
  );

  const briefingPresentation = useMemo(() => {
    if (!briefingSummary) {
      return null;
    }

    return buildBriefingPresentation({
      draft: planningDraft,
      visits,
      storesById,
      summary: briefingSummary,
    });
  }, [briefingSummary, planningDraft, storesById, visits]);

  const horizontalPadding = showRouteEntryLauncher
    ? HomeLayout.screenPaddingHorizontal
    : screenMode === 'planning' || isAddingStopsDuringWorkday
      ? Math.max(20, width * 0.05)
      : Math.max(AppSpacing.screenPaddingMin, width * AppSpacing.screenPaddingRatio);
  const contentMaxWidth = showRouteEntryLauncher
    ? width - HomeLayout.screenPaddingHorizontal * 2
    : screenMode === 'planning' || isAddingStopsDuringWorkday
      ? width - horizontalPadding * 2
      : Math.min(width - horizontalPadding * 2, 420);

  const handleCalculateRoute = () => {
    if (isCalculatingRoute) {
      return;
    }

    const editingRouteDuringWorkday = isWorkdayActive && isAddingStopsDuringWorkday;

    if (isWorkdayActive && !editingRouteDuringWorkday) {
      return;
    }

    const endLocation = getEffectiveEndLocation(planningDraft);

    if (!planningDraft.startLocation || !endLocation) {
      return;
    }

    setIsCalculatingRoute(true);
    setCalculationError(null);
    setCompletedCalculationSteps([]);
    setActiveCalculationStep('loading_stops');

    void (async () => {
      try {
        await setPhase('calculating');

        const result = await calculateTodayRoute({
          startLocation: planningDraft.startLocation!,
          endLocation,
          onProgress: (progress) => {
            setActiveCalculationStep(progress.step);
            setCompletedCalculationSteps(progress.completedSteps);
          },
        });

        if (!result.ok) {
          setCalculationError(result.message);
          await setPhase('planning');
          return;
        }

        await completeCalculation({
          estimate: result.estimate,
          startLocation: result.startLocation,
          endLocation: result.endLocation,
          returnToStart: planningDraft.returnToStart,
          drivingPolyline: result.drivingPolyline,
        });
        await refresh();
        await refreshPlanningDraft();

        if (editingRouteDuringWorkday) {
          setIsAddingStopsDuringWorkday(false);
          requestRouteRefresh();
        }
      } catch (error) {
        console.error('[TodayScreen] calculate route failed:', error);
        setCalculationError('Route calculation failed. Try again.');
        await setPhase('planning');
      } finally {
        setIsCalculatingRoute(false);
        setActiveCalculationStep(null);
      }
    })();
  };

  const beginTodayRouteNavigation = useCallback(
    async (options?: { force?: boolean }) => {
      if (isRestoring && !options?.force) {
        return false;
      }

      await startTodayRoute();
      await refreshWorkdayCoordinatorFromPersistence({
        action: 'startRoute',
        completionPhase: 'idle',
      });
      requestRouteRefresh();
      await refresh();
      return true;
    },
    [isRestoring, refresh, requestRouteRefresh],
  );

  const handleStartDay = () => {
    if (
      isRestoring ||
      isStartingDay ||
      isWorkdayActive ||
      startDayInFlightRef.current
    ) {
      return;
    }

    startDayInFlightRef.current = true;
    setIsStartingDay(true);
    setStartDayError(null);

    void (async () => {
      try {
        const prepared = await prepareStartDayLocationRequirements();

        if (!prepared.ok) {
          setStartDayError(prepared.message);
          return;
        }

        await syncPlanningDraftToTodayRouteSelection(planningDraft);
        await startWorkday();

        const activeTrip = await getActiveTrip();

        if (!activeTrip?.id) {
          setStartDayError(
            'Could not start the workday. Check location permission and try again.',
          );
          return;
        }

        if (activeTrip.id) {
          const routeContext = await buildActiveRouteContextFromPlanningDraft(planningDraft);

          await saveActiveTrip({
            ...activeTrip,
            routeContext,
          });
          await attachTripIdToTodayVisits(activeTrip.id);
        }

        await prepareVisitsForWorkdayRoutePlanning();
        await refreshWorkdayCoordinatorFromPersistence({
          action: 'startWorkday',
          completionPhase: 'idle',
        });
        await refresh();
        await refreshPlanningDraft();

        const routeStartedOk = await beginTodayRouteNavigation({ force: true });

        if (!routeStartedOk) {
          setStartDayError(
            'Workday started, but the route could not begin. Pull to refresh or tap Start Route.',
          );
        }
      } catch (error: unknown) {
        console.error('[TodayScreen] start day failed:', error);
        setStartDayError(
          'Could not start the workday. Check your connection and try again.',
        );
      } finally {
        startDayInFlightRef.current = false;
        setIsStartingDay(false);
      }
    })();
  };

  const showRouteComplete =
    isWorkdayActive && visitCompletionPhase === 'all_complete';

  const handleEndWorkday = () => {
    if (isRestoring || isFinishingWorkday) {
      return;
    }

    setIsFinishingWorkday(true);
    setFinishWorkdayError(null);

    void (async () => {
      try {
        await endWorkday();
        const stillActive = await getActiveTrip();

        if (stillActive) {
          setFinishWorkdayError(
            'Could not finish the workday. Check your connection and try again.',
          );
          return;
        }

        await clearRouteSessionTimingForToday();
        dismissRouteCompletePhase();
        await refresh();
        router.navigate('/' as const);
      } catch (error: unknown) {
        console.error('[TodayScreen] end workday failed:', error);
        setFinishWorkdayError(
          'Could not finish the workday. Check your connection and try again.',
        );
      } finally {
        setIsFinishingWorkday(false);
      }
    })();
  };

  const handleStartRoute = () => {
    if (isRestoring) {
      return;
    }

    void beginTodayRouteNavigation({ force: true }).catch((error: unknown) => {
      console.error('[TodayScreen] start route failed:', error);
    });
  };

  const routeStarted = useMemo(() => isTodayRouteStarted(visits), [visits]);

  const activeWorkdayHorizontalPadding = Math.max(16, Math.round(width * 0.04));

  const autoStartRouteAttemptedRef = useRef(false);

  useEffect(() => {
    if (!isWorkdayActive) {
      autoStartRouteAttemptedRef.current = false;
    }
  }, [isWorkdayActive]);

  useEffect(() => {
    if (screenMode !== 'active_workday' || routeStarted || isRestoring || showRouteComplete) {
      return;
    }

    if (!hasVisitStops(visits)) {
      if (!isAddingStopsDuringWorkday) {
        setIsAddingStopsDuringWorkday(true);
      }
      return;
    }

    if (autoStartRouteAttemptedRef.current) {
      return;
    }

    autoStartRouteAttemptedRef.current = true;

    void beginTodayRouteNavigation({ force: true }).catch((error: unknown) => {
      console.error('[TodayScreen] auto start route failed:', error);
      autoStartRouteAttemptedRef.current = false;
    });
  }, [
    beginTodayRouteNavigation,
    isAddingStopsDuringWorkday,
    isRestoring,
    routeStarted,
    screenMode,
    showRouteComplete,
    visits.length,
  ]);

  const handleRestartRoute = () => {
    if (isRestoring) {
      return;
    }

    void (async () => {
      try {
        const sorted = [...visits].sort(
          (left, right) => left.routeOrder - right.routeOrder,
        );

        if (sorted.length === 0) {
          return;
        }

        const now = Date.now();
        const resetVisits: StoreVisit[] = sorted.map((visit, index) => ({
          ...visit,
          status: index === 0 ? 'current' : 'pending',
          checkedInAt: undefined,
          checkInSource: undefined,
          automaticCheckInAt: undefined,
          completedAt: undefined,
          updatedAt: now,
        }));

        await replaceTodayVisits(resetVisits);
        await clearPendingVisitAdvancement();
        await refreshWorkdayCoordinatorFromPersistence({
          action: 'restartRoute',
          completionPhase: 'idle',
        });
        requestRouteRefresh();
        await refresh();
      } catch (error: unknown) {
        console.error('[TodayScreen] restart route failed:', error);
      }
    })();
  };

  const handleAddStopsDuringWorkday = useCallback(() => {
    if (isRestoring || !isWorkdayActive) {
      return;
    }

    setActiveWorkdayAddStopVisible(true);
  }, [isRestoring, isWorkdayActive]);

  const refreshAfterActiveWorkdayStopAdd = useCallback(async () => {
    await finalizeActiveWorkdayAfterStopAdded(visitCompletionPhase);
    requestRouteRefresh();
    await refresh();
    await refreshPlanningDraft();
  }, [refresh, refreshPlanningDraft, requestRouteRefresh, visitCompletionPhase]);

  const handleActiveWorkdayAddExistingStores = useCallback(
    async (storeIds: string[]) => {
      await addExistingStoresToTodayRoute(storeIds);
      await refreshAfterActiveWorkdayStopAdd();
    },
    [refreshAfterActiveWorkdayStopAdd],
  );

  const handleActiveWorkdayAddStopLocation = useCallback(
    async (location: RouteLocation) => {
      await addManualStopToTodayRoute(location);
      await refreshAfterActiveWorkdayStopAdd();
    },
    [refreshAfterActiveWorkdayStopAdd],
  );

  const handleAddStopForStore = useCallback(
    (storeId: string) => {
      if (isRestoring || !isWorkdayActive) {
        return;
      }

      void (async () => {
        try {
          await addExistingStoresToTodayRoute([storeId]);
          await refreshAfterActiveWorkdayStopAdd();
        } catch (error: unknown) {
          console.error('[TodayScreen] add stop for store failed:', error);
          Alert.alert(
            'Add stop',
            error instanceof Error
              ? error.message
              : 'Could not add this stop. Try again.',
          );
        }
      })();
    },
    [isRestoring, isWorkdayActive, refreshAfterActiveWorkdayStopAdd],
  );

  const handleScrollActiveWorkdayToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleClearRoute = () => {
    if (isRestoring) {
      return;
    }

    void (async () => {
      try {
        await clearTodayRouteStops();
        await clearPendingVisitAdvancement();
        await clearRouteSessionTimingForToday();
        dismissRouteCompletePhase();
        await refreshWorkdayCoordinatorFromPersistence({
          action: 'clearRoute',
          completionPhase: 'idle',
        });
        requestRouteRefresh();
        await refresh();
        await refreshPlanningDraft();

        if (isWorkdayActive) {
          await backToPlanning();
        }
      } catch (error: unknown) {
        console.error('[TodayScreen] clear route failed:', error);
      }
    })();
  };

  const routeEditOptions = useMemo(
    () => ({
      completionPhase: visitCompletionPhase,
      duringActiveWorkday: isWorkdayActive,
    }),
    [isWorkdayActive, visitCompletionPhase],
  );

  const handleRemoveStopFromRoute = (visitId: string, stopName: string) => {
    Alert.alert(
      'Remove stop?',
      `Remove ${stopName} from today's route? The store stays in your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void applyRemoveFromToday(visitId, {
              ...routeEditOptions,
              visits,
            })
              .then((removed) => {
                if (removed) {
                  requestRouteRefresh();
                }
              })
              .catch((error: unknown) => {
                console.error('[TodayScreen] remove stop failed:', error);
              });
          },
        },
      ],
    );
  };

  const handleReorderRoute = (orderedVisitIds: string[]) => {
    void applyRouteReorder(orderedVisitIds, routeEditOptions)
      .then(async () => {
        requestRouteRefresh();
        await refresh();
        await refreshPlanningDraft();
      })
      .catch((error: unknown) => {
        console.error('[TodayScreen] reorder route failed:', error);
      });
  };

  const handleMakeNextStop = (visitId: string) => {
    void applyMakeNext(visits, visitId, routeEditOptions)
      .then(() => requestRouteRefresh())
      .catch((error: unknown) => {
        console.error('[TodayScreen] make next failed:', error);
      });
  };

  const handleMakeFirstStop = (visitId: string) => {
    void applyMakeFirst(visits, visitId, routeEditOptions)
      .then((applied) => {
        if (applied) {
          requestRouteRefresh();
        }
      })
      .catch((error: unknown) => {
        console.error('[TodayScreen] make first failed:', error);
      });
  };

  const handleUndoCheckIn = (visitId: string) => {
    if (isRestoring) {
      return;
    }

    Alert.alert(
      'Undo check-in?',
      'This stop will return to pending and the visit timer will clear.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo check-in',
          style: 'destructive',
          onPress: () => {
            void undoActiveCheckIn(visitId)
              .then(() => requestRouteRefresh())
              .catch((error: unknown) => {
                console.error('[TodayScreen] undo check-in failed:', error);
              });
          },
        },
      ],
    );
  };

  const handleOpenStore = (storeId: string) => {
    const openTarget = visits
      .map((visit) => ({
        visit,
        store: storesById[visit.storeId],
      }))
      .find((entry) => entry.store?.id === storeId);

    if (!openTarget?.store) {
      router.push(`/store/${storeId}`);
      return;
    }

    void (async () => {
      try {
        if (openTarget.visit.status === 'current') {
          await checkInVisit(openTarget.visit.id);
          await refresh();
        }

        router.push(`/store/${storeId}`);
      } catch (error) {
        console.error('[TodayScreen] open store failed:', error);
      }
    })();
  };

  const finishedCount = countFinishedVisits(visits);

  const showLoading = screenMode === 'loading' && !showRouteEntryLauncher;
  const planningSummary = usePlanningRouteSummary({
    draft: planningDraft,
    isCalculating: isCalculatingRoute,
    storesById,
    visits,
  });
  const showPlanningRouteDock = shouldShowPlanningRouteDock({
    screenMode: showRoutePlanningCanvas ? 'planning' : screenMode,
    hasStops: planningSummary.hasStops,
    isCalculatingRoute,
    isAddressEntryActive: isPlanningAddressEntryActive,
    isKeyboardVisible,
  });
  const planningDockVisible =
    ROUTE_PLANNING_DOCK_UI_ENABLED && showPlanningRouteDock;
  const planningScrollPaddingBottom = planningDockVisible
    ? dockedSummaryHeight +
      PlanningLayout.scrollClearanceExtra +
      (navigationMode === 'workday' ? workdayDockTotalHeight(insets.bottom) : 0)
    : PlanningLayout.scrollClearanceExtra;

  const workdayScrollPaddingBottom =
    navigationMode === 'workday'
      ? insets.bottom +
        AppSpacing.tabBarContentHeight +
        PlanningLayout.scrollClearanceExtra +
        72
      : PlanningLayout.scrollClearanceExtra;

  useEffect(() => {
    registerHandlers({
      onAddStop: handleAddStopsDuringWorkday,
      onEditRoute: enterRouteEdit,
    });
  }, [enterRouteEdit, handleAddStopsDuringWorkday, registerHandlers]);

  useEffect(() => {
    if (!focusScrollTarget) {
      return;
    }

    if (focusScrollTarget === 'current-stop') {
      scrollRef.current?.scrollTo({ animated: true, y: 0 });
      requestScrollTo(null);
      return;
    }

    if (
      focusScrollTarget === 'route-map' &&
      mapSectionRef.current &&
      scrollContentRef.current
    ) {
      mapSectionRef.current.measureLayout(
        scrollContentRef.current,
        (_x, y) => {
          scrollRef.current?.scrollTo({
            animated: true,
            y: Math.max(0, y - 12),
          });
          requestScrollTo(null);
        },
        () => {
          requestScrollTo(null);
        },
      );
    }
  }, [focusScrollTarget, requestScrollTo]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleOpenSavedRoutes = () => {
    void (async () => {
      try {
        await ensureDefaultSavedRoutes();
        setSavedRoutes(await getSavedRoutes());
        setShowSavedRoutesSheet(true);
      } catch (error) {
        console.error('[TodayScreen] load saved routes failed:', error);
      }
    })();
  };

  const handleSelectSavedRoute = (route: SavedRoute) => {
    void (async () => {
      try {
        await applySavedRouteToToday(route);
        setRoutePlanningSessionOpen(true);
        await refresh();
        await refreshPlanningDraft();
      } catch (error) {
        console.error('[TodayScreen] apply saved route failed:', error);
      }
    })();
  };

  const returnToRouteLauncher = () => {
    void (async () => {
      const clearStops = visits.length > 0;

      try {
        if (clearStops) {
          await clearTodayRouteStops();
          await clearRouteSessionTimingForToday();
        }

        await backToPlanning();
        setRoutePlanningSessionOpen(false);
        await refresh();
        await refreshPlanningDraft();
      } catch (error) {
        console.error('[TodayScreen] return to launcher failed:', error);
      }
    })();
  };

  const handleReturnToRouteLauncherWithConfirm = () => {
    const clearStops = visits.length > 0;

    Alert.alert(
      'Back to launcher?',
      clearStops
        ? "Today's stops will be removed from the route. Start and finish locations stay saved until you change them in route setup."
        : 'Return to the route launcher.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Back to launcher',
          onPress: returnToRouteLauncher,
        },
      ],
    );
  };

  const showActiveWorkdayRoute =
    !showLoading &&
    !showRouteEntryLauncher &&
    screenMode === 'active_workday' &&
    !showRouteComplete &&
    (routeStarted || hasVisitStops(visits));

  const activeWorkdayRouteStoreIds = useMemo(
    () => [...new Set(visits.map((visit) => visit.storeId))],
    [visits],
  );

  const activeWorkdayAddStopDistanceAnchor = useMemo(
    () => getStartLocation(planningDraft),
    [planningDraft],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        {showActiveWorkdayRoute ? (
          <View
            style={[
              styles.activeWorkdayShell,
              {
                paddingHorizontal: activeWorkdayHorizontalPadding,
                width: '100%',
              },
            ]}
          >
            <CoordinatorLiveRouteScreen
              current={current}
              dateHeading={formatTodayHeading()}
              draft={planningDraft}
              estimatedFinishAt={
                dynamicEstimatedFinishAt ??
                planningDraft.estimate?.estimatedFinishAt ??
                null
              }
              isRestoring={isRestoring}
              isWorkdayActive={isWorkdayActive}
              liveRouteViewMode={liveRouteViewMode}
              mapSectionRef={mapSectionRef}
              next={next}
              onAddStops={handleAddStopsDuringWorkday}
              onAddStopForStore={handleAddStopForStore}
              onClearRoute={handleClearRoute}
              onContinueToNext={continueToNextStop}
              onEndWorkday={handleEndWorkday}
              onMakeFirstStop={handleMakeFirstStop}
              onMakeNextStop={handleMakeNextStop}
              onOpenStore={handleOpenStore}
              onRemoveStop={handleRemoveStopFromRoute}
              onReorderStops={handleReorderRoute}
              onRestartRoute={handleRestartRoute}
              onRouteComplete={enterRouteCompletePhase}
              onScrollToTop={handleScrollActiveWorkdayToTop}
              onStartRoute={handleStartRoute}
              onUndoCheckIn={handleUndoCheckIn}
              routeStarted={routeStarted}
              permissionDenied={permissionDenied}
              showContinueToNext={showContinueToNext}
              storesById={storesById}
              totalCount={totalCount}
              visits={visits}
            />
            <AddStopScreen
              currentRouteStoreIds={activeWorkdayRouteStoreIds}
              distanceAnchorLocation={activeWorkdayAddStopDistanceAnchor}
              intent="stop"
              onAddExistingStore={handleActiveWorkdayAddExistingStores}
              onAddStop={handleActiveWorkdayAddStopLocation}
              onClose={() => {
                setActiveWorkdayAddStopVisible(false);
              }}
              visible={activeWorkdayAddStopVisible}
            />
          </View>
        ) : (
        <>
        <NestableScrollContainer
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
            showRouteEntryLauncher
              ? {
                  paddingBottom:
                    insets.bottom + AppSpacing.tabBarContentHeight + AppSpacing.shellBottomPadding,
                  paddingTop: 8,
                }
              : null,
            screenMode === 'planning' || isAddingStopsDuringWorkday
              ? [
                  styles.planningScrollContent,
                  { paddingBottom: planningScrollPaddingBottom },
                ]
              : null,
            screenMode === 'briefing'
              ? { paddingBottom: PlanningLayout.scrollClearanceExtra }
              : null,
            screenMode === 'active_workday' && !showRouteComplete
              ? { paddingBottom: workdayScrollPaddingBottom }
              : null,
            showRouteComplete ? { paddingBottom: insets.bottom + 16 } : null,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
        <View
          ref={scrollContentRef}
          style={[styles.content, { maxWidth: contentMaxWidth, width: '100%' }]}
        >
          {!showLoading && showRouteEntryLauncher ? (
            <HomeIdleScreen
              myLocations={myLocations}
              planningStartLocation={planningDraft.startLocation}
              todayRouteSelection={todayRouteSelection}
              onLoadWorkday={handleOpenSavedRoutes}
              onNewWorkday={() => {
                void (async () => {
                  try {
                    await clearTodayRouteStops();
                    await clearRouteSessionTimingForToday();
                    await clearPendingVisitAdvancement();
                    await resetRoutePlanningForNewRoute({ myLocations });
                    setRoutePlanningSessionOpen(true);
                    await refresh();
                    await refreshPlanningDraft();
                  } catch (error) {
                    console.error('[TodayScreen] prepare new route failed:', error);
                  }
                })();
              }}
              onOpenProfile={() => {
                router.push('/profile' as Href);
              }}
              onOpenWorkdayHistory={() => {
                router.push('/history' as const);
              }}
            />
          ) : null}

          {!showLoading &&
          !showRouteEntryLauncher &&
          screenMode !== 'planning' &&
          screenMode !== 'active_workday' &&
          screenMode !== 'briefing' ? (
            <HomeHeader
              onLongPressTitle={() => {
                router.push('/diagnostics' as const);
              }}
              subtitle={formatTodayHeading()}
              title="Route"
            />
          ) : null}

          {showLoading ? (
            <View
              accessibilityLabel="Loading today's workday"
              accessibilityRole="progressbar"
              style={styles.loadingContainer}
            >
              <ActivityIndicator color={AppColors.blue} size="large" />
            </View>
          ) : null}

          {!showLoading &&
          !showRouteEntryLauncher &&
          showRoutePlanningCanvas ? (
            <CoordinatorPlanningScreen
              addStopAnchorRef={buildRouteAddStopAnchorRef}
              draft={planningDraft}
              duringActiveWorkday={isWorkdayActive}
              myLocations={myLocations}
              onAddressEntryActiveChange={setIsPlanningAddressEntryActive}
              onExitActiveRouteEdit={() => {
                setIsAddingStopsDuringWorkday(false);
                void refresh();
              }}
              onImportStores={() => {
                router.push('/store-import' as const);
              }}
              onLoadSavedRoute={handleOpenSavedRoutes}
              onRefresh={async () => {
                await refresh();
                await refreshPlanningDraft();
              }}
              onReturnToLauncher={
                !isWorkdayActive ? returnToRouteLauncher : undefined
              }
              onUpdateLocations={updateLocations}
              onSetRoute={handleCalculateRoute}
              routeSetBlockerMessage={planningSummary.blockerMessage}
              routeSetDisabled={!planningSummary.canCalculate || isCalculatingRoute}
              isCalculatingRoute={isCalculatingRoute}
              storesById={storesById}
              visits={visits}
            />
          ) : null}

          {!showLoading &&
          !showRouteEntryLauncher &&
          screenMode === 'briefing' &&
          briefingSummary &&
          briefingPresentation ? (
            <WorkdayPreviewScreen
              draft={planningDraft}
              isStarting={isStartingDay}
              onBackToPlanning={() => {
                void backToPlanning();
              }}
              onInsightPress={(row) => {
                if (row.kind === 'visit_notes') {
                  router.push('/visit-history' as const);
                  return;
                }

                router.push('/(tabs)/stores' as const);
              }}
              onOpenStore={handleOpenStore}
              onStartDay={handleStartDay}
              permissionDenied={permissionDenied}
              presentation={briefingPresentation}
              startDayError={startDayError}
              storesById={storesById}
              summary={briefingSummary}
              visits={visits}
            />
          ) : null}

          {!showLoading && !showRouteEntryLauncher && screenMode === 'completed_day' ? (
            <WorkdayCompleteCard
              completedCount={finishedCount}
              totalCount={totalCount}
            />
          ) : null}

          {!showLoading &&
          !showRouteEntryLauncher &&
          screenMode === 'active_workday' &&
          showRouteComplete ? (
            <RouteCompleteScreen
              key={routeCompleteCelebrationKey}
              finishError={finishWorkdayError}
              isFinishing={isFinishingWorkday}
              onFinishWorkday={handleEndWorkday}
              onOpenStore={handleOpenStore}
            />
          ) : null}

          {!showLoading &&
          !showRouteEntryLauncher &&
          screenMode === 'active_workday' &&
          !showRouteComplete &&
          !routeStarted &&
          hasVisitStops(visits) &&
          !showActiveWorkdayRoute ? (
            <View
              accessibilityLabel="Starting route"
              accessibilityRole="progressbar"
              style={styles.loadingContainer}
            >
              <ActivityIndicator color={AppColors.blue} size="large" />
            </View>
          ) : null}
        </View>
        </NestableScrollContainer>

        {planningDockVisible ? (
          <PlanningRouteDock
            blockerMessage={planningSummary.blockerMessage}
            bottomInset={
              navigationMode === 'workday' ? workdayDockTotalHeight(insets.bottom) : 0
            }
            distanceLabel={planningSummary.distanceLabel}
            onLayout={setDockedSummaryHeight}
            onPrimaryPress={handleCalculateRoute}
            primaryDisabled={!planningSummary.canCalculate}
            primaryLabel="Set Route"
            stopsLabel={planningSummary.stopsLabel}
            timeLabel={planningSummary.timeLabel}
            visible={showPlanningRouteDock}
          />
        ) : null}
        </>
        )}
      </View>

      <RouteCalculationTransition
        activeStep={activeCalculationStep}
        completedSteps={completedCalculationSteps}
        errorMessage={calculationError}
        onRetry={calculationError ? handleCalculateRoute : undefined}
        visible={
          !showRouteEntryLauncher &&
          (screenMode === 'calculating' || isCalculatingRoute)
        }
      />

      <SavedRoutesSheet
        onClose={() => {
          setShowSavedRoutesSheet(false);
        }}
        onSelectRoute={handleSelectSavedRoute}
        routes={savedRoutes}
        visible={showSavedRoutesSheet}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 12,
  },
  planningScrollContent: {
    paddingTop: 8,
  },
  content: {
    alignSelf: 'center',
    gap: AppSpacing.sectionGap,
  },
  activeWorkdayShell: {
    alignSelf: 'stretch',
    flex: 1,
    gap: 0,
    maxWidth: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
});
