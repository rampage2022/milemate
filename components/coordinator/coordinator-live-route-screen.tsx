import { useMemo, useRef, type RefObject } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ActiveWorkdayReorderScreen,
  ACTIVE_WORKDAY_REORDER_FOOTER_HEIGHT,
} from '@/components/coordinator/active-workday-reorder-screen';
import {
  ActiveWorkdayBottomBar,
  activeWorkdayActionBarBottomPadding,
  activeWorkdayBottomScrollInset,
} from '@/components/coordinator/active-workday-bottom-bar';
import { ActiveWorkdayScreen } from '@/components/coordinator/active-workday-screen';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import { useRouteEditSession } from '@/contexts/route-edit-session-context';
import { useWorkdayNavigation } from '@/contexts/workday-navigation-context';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import type { TodayRouteStore } from '@/hooks/use-today-route';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { getFinishLocation, getStartLocation } from '@/utils/route-state';
import {
  buildActiveRouteExperienceModel,
  buildPlanningRouteExperienceModel,
} from '@/utils/route-experience-map-model';

type CoordinatorLiveRouteScreenProps = {
  current: TodayRouteStore | null;
  dateHeading: string;
  draft: RoutePlanningDraft;
  estimatedFinishAt?: string | null;
  isRestoring: boolean;
  isWorkdayActive: boolean;
  liveRouteViewMode?: 'current-stop' | 'route';
  mapSectionRef?: RefObject<View | null>;
  next: TodayRouteStore | null;
  onAddStops: () => void;
  onAddStopForStore: (storeId: string) => void;
  onClearRoute: () => void;
  onContinueToNext: () => void;
  onEndWorkday: () => void;
  onMakeFirstStop?: (visitId: string) => void;
  onMakeNextStop: (visitId: string) => void;
  onOpenStore: (storeId: string) => void;
  onRemoveStop: (visitId: string, stopName: string) => void;
  onReorderStops: (orderedVisitIds: string[]) => void;
  onRestartRoute: () => void;
  onRouteComplete: () => void;
  onScrollToTop?: () => void;
  onStartRoute: () => void;
  onUndoCheckIn: (visitId: string) => void;
  permissionDenied: boolean;
  routeStarted: boolean;
  showContinueToNext: boolean;
  storesById: Record<string, Store>;
  totalCount: number;
  visits: StoreVisit[];
};

function openRouteMenu(input: {
  onAddStops: () => void;
  onClearRoute: () => void;
  onEndWorkday: () => void;
  onRestartRoute: () => void;
  onRouteComplete: () => void;
  routeStarted: boolean;
  visits: StoreVisit[];
}) {
  const hasRemaining = input.visits.some(
    (visit) => visit.status !== 'completed' && visit.status !== 'skipped',
  );

  Alert.alert('Route options', undefined, [
    { text: 'Add stops', onPress: input.onAddStops },
    {
      text: 'Complete route',
      onPress: () => {
        if (!hasRemaining) {
          void input.onRouteComplete();
          return;
        }

        Alert.alert('Complete route?', undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes', onPress: input.onEndWorkday },
        ]);
      },
    },
    {
      text: 'Clear route',
      style: 'destructive',
      onPress: input.onClearRoute,
    },
    {
      text: 'Restart route',
      style: 'destructive',
      onPress: input.onRestartRoute,
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export function CoordinatorLiveRouteScreen({
  current,
  dateHeading,
  draft,
  estimatedFinishAt = null,
  isRestoring,
  mapSectionRef,
  next,
  onAddStops,
  onAddStopForStore,
  onClearRoute,
  onEndWorkday,
  onOpenStore,
  onRemoveStop,
  onReorderStops,
  onRestartRoute,
  onRouteComplete,
  onScrollToTop,
  permissionDenied,
  routeStarted,
  storesById,
  visits,
}: CoordinatorLiveRouteScreenProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { distanceMiles, startedAt } = useWorkdayTrackerContext();
  const { mode: navigationMode, preWorkdayTabBarHidden } = useWorkdayNavigation();
  const { enterRouteEdit, isRouteEditMode, exitRouteEdit } = useRouteEditSession();

  const tabBarVisible =
    !isRestoring &&
    !preWorkdayTabBarHidden &&
    navigationMode !== 'completion';
  const actionBarBottomPadding = activeWorkdayActionBarBottomPadding({
    safeAreaBottom: insets.bottom,
    tabBarVisible,
  });
  const scrollClearanceBottom = activeWorkdayBottomScrollInset({
    safeAreaBottom: insets.bottom,
    tabBarContentHeight: AppSpacing.tabBarContentHeight,
    tabBarVisible,
  });
  const reorderScrollPaddingBottom = ACTIVE_WORKDAY_REORDER_FOOTER_HEIGHT + 16;

  const activeMapHeight = Math.round(
    Math.min(Math.max(windowHeight * 0.32, 220), 300),
  );

  const activeStopVisitId = routeStarted ? (current?.visit.id ?? null) : null;
  const finishLocation = useMemo(() => getFinishLocation(draft), [draft]);
  const startLocation = useMemo(() => getStartLocation(draft), [draft]);
  const routeStoreIds = useMemo(
    () => [...new Set(visits.map((visit) => visit.storeId))],
    [visits],
  );

  const activeFocus = useMemo(
    () => ({
      currentStoreId: current?.store.id ?? null,
      nextStoreId: next?.store.id ?? null,
    }),
    [current?.store.id, next?.store.id],
  );

  const routeMapModel = useMemo(
    () =>
      routeStarted
        ? buildActiveRouteExperienceModel({
            draft,
            visits,
            storesById,
            focus: activeFocus,
          })
        : buildPlanningRouteExperienceModel({
            draft,
            visits,
            storesById,
          }),
    [activeFocus, draft, routeStarted, storesById, visits],
  );

  function handleSkipCurrentStop() {
    Alert.alert(
      'Skip stop',
      'Skip flows with reasons and undo will ship in the next pass. Use route edit or complete the visit for now.',
    );
  }

  function handleScrollToTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    onScrollToTop?.();
  }

  return (
    <View collapsable={false} ref={mapSectionRef} style={styles.shell}>
      {isRouteEditMode ? (
        <ActiveWorkdayReorderScreen
          bottomInset={actionBarBottomPadding}
          currentVisitId={activeStopVisitId}
          draft={draft}
          onDone={exitRouteEdit}
          onPressStop={onOpenStore}
          onRemoveStop={onRemoveStop}
          onReorderStops={onReorderStops}
          scrollPaddingBottom={reorderScrollPaddingBottom}
          storesById={storesById}
          visits={visits}
        />
      ) : (
        <>
          <ActiveWorkdayScreen
            currentVisitId={activeStopVisitId}
            dateHeading={dateHeading}
            estimatedFinishAt={estimatedFinishAt}
            finishLocation={finishLocation}
            fromStore={current?.store ?? null}
            mapHeight={activeMapHeight}
            mapModel={routeMapModel}
            onAddStopForStore={onAddStopForStore}
            onOpenMenu={() => {
              openRouteMenu({
                onAddStops,
                onClearRoute,
                onEndWorkday,
                onRestartRoute,
                onRouteComplete,
                routeStarted,
                visits,
              });
            }}
            onOpenStore={onOpenStore}
            onScrollToTop={handleScrollToTop}
            routeStoreIds={routeStoreIds}
            scrollPaddingBottom={scrollClearanceBottom}
            scrollRef={scrollRef}
            startLocation={startLocation}
            storesById={storesById}
            totalDistanceMiles={distanceMiles}
            visits={visits}
            workdayStartedAt={startedAt}
          />
          <ActiveWorkdayBottomBar
            bottomInset={actionBarBottomPadding}
            onAddStops={onAddStops}
            onEnterRouteEdit={enterRouteEdit}
            onSkipCurrentStop={handleSkipCurrentStop}
          />
        </>
      )}

      {permissionDenied ? (
        <Text style={styles.error}>
          Location access is required to track your workday.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
  },
  error: {
    color: AppColors.red,
    fontSize: 15,
    textAlign: 'center',
  },
});
