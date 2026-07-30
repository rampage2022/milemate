import { useEffect, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { LiveStopCard } from '@/components/coordinator/live-stop-card';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { CompletedStopCard } from '@/components/stops/completed-stop-card';
import { CurrentStopCard } from '@/components/stops/current-stop-card';
import { RouteProgressPill } from '@/components/stops/route-progress-pill';
import { UpNextStopCard } from '@/components/stops/up-next-stop-card';
import { closeAllSwipeActions } from '@/components/shared/swipe-action-row';
import { AppColors } from '@/components/shared/app-theme';
import { useArrivalCheckIn } from '@/contexts/arrival-check-in-context';
import { useVisitAdvancement } from '@/contexts/visit-advancement-context';
import { RouteEndpointCard } from '@/components/coordinator/route-endpoint-card';
import { StopsRouteEditPanel } from '@/components/stops/stops-route-edit-panel';
import { useRouteEditSession } from '@/contexts/route-edit-session-context';
import { useGestureInteractionCleanup } from '@/hooks/use-gesture-interaction-cleanup';
import { getFinishLocation, getStartLocation } from '@/utils/route-state';
import { resolveNextVisit } from '@/services/store-visits';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { RouteDeliveryChipModel } from '@/utils/route-store-delivery-signal';
import {
  buildRouteStoreCardViewModel,
  mapLiveStopStateToVariant,
} from '@/utils/route-store-card-model';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { resolveLiveStopPresentationState } from '@/utils/live-route-summary';
import {
  getStopDisplayStatus,
  isActiveStopVisit,
} from '@/utils/stop-display-status';
import { getStoreDisplayName } from '@/utils/get-store-display-name';

type LiveStopRow = {
  visit: StoreVisit;
  store: Store;
};

type LiveStopListProps = {
  currentVisitId: string | null;
  deliveryByStoreId?: Record<string, RouteDeliveryChipModel | null>;
  draft: RoutePlanningDraft;
  fromStore?: Store | null;
  highlightedStoreId?: string | null;
  isRouteMenuDisabled?: boolean;
  onAddStops: () => void;
  onClearRoute: () => void;
  onHighlightStop?: (storeId: string) => void;
  onPressStop: (storeId: string) => void;
  onMakeFirst?: (visitId: string) => void;
  onMakeNext: (visitId: string) => void;
  onRemove: (visitId: string, stopName: string) => void;
  onReorder: (orderedVisitIds: string[]) => void;
  onRestartRoute: () => void;
  onUndoCheckIn: (visitId: string) => void;
  progressCompletedStops: number;
  progressTotalStops: number;
  routeStarted: boolean;
  isWorkdayActive: boolean;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
};

function openRouteMenu(input: {
  onAddStops: () => void;
  onClearRoute: () => void;
  onRestartRoute: () => void;
}) {
  Alert.alert('Route options', undefined, [
    { text: 'Add stops', onPress: input.onAddStops },
    {
      text: 'Clear route',
      style: 'destructive',
      onPress: () => {
        Alert.alert(
          'Clear route?',
          'Remove pending stops from today\u2019s route? Completed and skipped visits stay in Visit History.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear route',
              style: 'destructive',
              onPress: input.onClearRoute,
            },
          ],
        );
      },
    },
    {
      text: 'Restart route',
      style: 'destructive',
      onPress: () => {
        Alert.alert(
          'Restart route?',
          'Stop progress will reset and you will start again from the first stop.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Restart', style: 'destructive', onPress: input.onRestartRoute },
          ],
        );
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

function buildRowViewModel(
  row: LiveStopRow,
  input: {
    currentVisitId: string | null;
    deliveryByStoreId: Record<string, RouteDeliveryChipModel | null>;
    fromStore: Store | null;
    nextVisitId: string | null;
    visits: StoreVisit[];
    storesById: Record<string, Store>;
  },
) {
  const state = resolveLiveStopPresentationState({
    currentVisitId: input.currentVisitId,
    visit: row.visit,
  });
  const variant = mapLiveStopStateToVariant(state, {
    currentVisitId: input.currentVisitId,
    nextVisitId: input.nextVisitId,
    visitId: row.visit.id,
  });

  return buildRouteStoreCardViewModel({
    currentVisitId: input.currentVisitId,
    delivery: input.deliveryByStoreId[row.store.id] ?? null,
    fromStore: input.fromStore ?? undefined,
    nextVisitId: input.nextVisitId,
    store: row.store,
    variant,
    visit: row.visit,
    visits: input.visits,
    storesById: input.storesById,
  });
}

export function LiveStopList({
  currentVisitId,
  deliveryByStoreId = {},
  draft,
  fromStore = null,
  highlightedStoreId = null,
  isRouteMenuDisabled = false,
  onAddStops,
  onClearRoute,
  onHighlightStop,
  onMakeFirst,
  onMakeNext,
  onPressStop,
  onRemove,
  onReorder,
  onRestartRoute,
  onUndoCheckIn,
  progressCompletedStops,
  progressTotalStops,
  routeStarted,
  isWorkdayActive,
  storesById,
  visits,
}: LiveStopListProps) {
  useGestureInteractionCleanup('Today/LiveStops');

  const { exitRouteEdit, enterRouteEdit, isRouteEditMode, canEnterRouteEdit } =
    useRouteEditSession();

  const {
    arrivalStatus,
    autoCheckInMode,
    distanceMiles,
    estimatedEtaMinutes,
    handleAskCheckIn,
    hasArrived,
    isAutomaticCheckInPending,
    showAskPrompt,
  } = useArrivalCheckIn();
  const { beginVisitCompletion, isCompletionActive } = useVisitAdvancement();

  const rowsFromProps = useMemo(() => {
    return [...visits]
      .sort((left, right) => left.routeOrder - right.routeOrder)
      .flatMap((visit) => {
        const store = storesById[visit.storeId];

        if (!store) {
          return [];
        }

        return [{ visit, store }];
      });
  }, [storesById, visits]);

  const nextVisitId = useMemo(() => {
    const currentVisit =
      currentVisitId !== null
        ? visits.find((visit) => visit.id === currentVisitId) ?? null
        : null;

    return resolveNextVisit(visits, currentVisit)?.id ?? null;
  }, [currentVisitId, visits]);

  const viewModelInput = useMemo(
    () => ({
      currentVisitId,
      deliveryByStoreId,
      fromStore,
      nextVisitId,
      visits,
      storesById,
    }),
    [
      currentVisitId,
      deliveryByStoreId,
      fromStore,
      nextVisitId,
      visits,
      storesById,
    ],
  );

  const currentRow = useMemo(
    () =>
      rowsFromProps.find(
        (row) =>
          row.visit.id === currentVisitId ||
          row.visit.status === 'current' ||
          row.visit.status === 'checked_in',
      ) ?? null,
    [currentVisitId, rowsFromProps],
  );

  const completedRows = useMemo(
    () => rowsFromProps.filter((row) => row.visit.status === 'completed'),
    [rowsFromProps],
  );

  const skippedRows = useMemo(
    () => rowsFromProps.filter((row) => row.visit.status === 'skipped'),
    [rowsFromProps],
  );

  const pendingStopRows = useMemo(
    () => rowsFromProps.filter((row) => row.visit.status === 'pending'),
    [rowsFromProps],
  );

  const startLocation = useMemo(() => getStartLocation(draft), [draft]);
  const finishLocation = useMemo(() => getFinishLocation(draft), [draft]);

  useEffect(() => {
    return () => {
      closeAllSwipeActions();
    };
  }, []);

  const arrivalSnapshot = useMemo(
    () => ({
      hasArrived,
      distanceMiles,
      estimatedEtaMinutes,
    }),
    [distanceMiles, estimatedEtaMinutes, hasArrived],
  );

  function handleOpenStore(storeId: string) {
    onHighlightStop?.(storeId);
    onPressStop(storeId);
  }

  function handleCompleteCurrentVisit(row: LiveStopRow) {
    if (isCompletionActive) {
      return;
    }

    void beginVisitCompletion({
      visitId: row.visit.id,
      completedStoreId: row.store.id,
      completedStoreName: getStoreDisplayName(row.store),
    });
  }

  function renderStaticStopCard(row: LiveStopRow) {
    const { visit, store } = row;
    const state = resolveLiveStopPresentationState({
      currentVisitId,
      visit,
    });
    const isActiveStop = isActiveStopVisit({ currentVisitId, visit });
    const activeDisplayStatus = getStopDisplayStatus({
      arrivalStatus: isActiveStop ? arrivalStatus : undefined,
      hasArrived: isActiveStop ? hasArrived : undefined,
      isActiveStop,
      visit,
    });
    const variant = mapLiveStopStateToVariant(state, {
      currentVisitId,
      nextVisitId,
      visitId: visit.id,
    });
    const viewModel = buildRouteStoreCardViewModel({
      currentVisitId,
      delivery: deliveryByStoreId[store.id] ?? null,
      fromStore: fromStore ?? undefined,
      nextVisitId,
      store,
      variant,
      visit,
      visits,
      storesById,
    });

    return (
      <LiveStopCard
        activeDisplayStatus={activeDisplayStatus}
        canUndoCheckIn={visit.status === 'checked_in'}
        isMapHighlighted={highlightedStoreId === store.id}
        key={visit.id}
        onPress={() => {
          handleOpenStore(store.id);
        }}
        onUndoCheckIn={() => {
          onUndoCheckIn(visit.id);
        }}
        state={state}
        viewModel={viewModel}
        visit={visit}
      />
    );
  }

  const currentViewModel =
    currentRow !== null
      ? buildRowViewModel(currentRow, viewModelInput)
      : null;
  const currentActiveDisplayStatus =
    currentRow !== null
      ? getStopDisplayStatus({
          arrivalStatus,
          hasArrived,
          isActiveStop: true,
          visit: currentRow.visit,
        })
      : null;

  return (
    <View style={styles.list}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Stops</Text>
        <RouteProgressPill
          completedStops={progressCompletedStops}
          totalStops={progressTotalStops}
        />
        {isRouteEditMode ? (
          <Pressable
            accessibilityLabel="Done editing route"
            accessibilityRole="button"
            onPress={exitRouteEdit}
            style={({ pressed }) => [
              styles.editToggleButton,
              styles.editToggleDone,
              pressed && styles.menuButtonPressed,
            ]}
          >
            <Text style={styles.editToggleDoneLabel}>Done</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Edit route"
            accessibilityRole="button"
            disabled={isRouteMenuDisabled || !canEnterRouteEdit}
            onPress={enterRouteEdit}
            style={({ pressed }) => [
              styles.editToggleButton,
              (isRouteMenuDisabled || !canEnterRouteEdit) &&
                styles.menuButtonDisabled,
              pressed && canEnterRouteEdit && !isRouteMenuDisabled && styles.menuButtonPressed,
            ]}
          >
            <Text style={styles.editToggleLabel}>Edit</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityLabel="Route options"
          accessibilityRole="button"
          disabled={isRouteMenuDisabled}
          onPress={() => {
            openRouteMenu({ onAddStops, onClearRoute, onRestartRoute });
          }}
          style={({ pressed }) => [
            styles.menuButton,
            isRouteMenuDisabled && styles.menuButtonDisabled,
            pressed && !isRouteMenuDisabled && styles.menuButtonPressed,
          ]}
        >
          <Ionicons color={AppColors.textSecondary} name="ellipsis-horizontal" size={18} />
        </Pressable>
      </View>

      {isRouteEditMode ? (
        <StopsRouteEditPanel
          currentVisitId={currentVisitId}
          draft={draft}
          onHighlightStop={onHighlightStop}
          onPressStop={onPressStop}
          onRemove={onRemove}
          onReorder={onReorder}
          storesById={storesById}
          visits={visits}
        />
      ) : (
        <>
      <RouteEndpointCard kind="start" location={startLocation} locked />

      {currentRow && currentViewModel && currentActiveDisplayStatus ? (
        <View style={styles.section}>
          <CurrentStopCard
            activeDisplayStatus={currentActiveDisplayStatus}
            arrival={arrivalSnapshot}
            arrivalStatus={arrivalStatus}
            autoCheckInMode={autoCheckInMode}
            delivery={deliveryByStoreId[currentRow.store.id] ?? null}
            isAutomaticCheckInPending={isAutomaticCheckInPending}
            isCompletionActive={isCompletionActive}
            isMapHighlighted={highlightedStoreId === currentRow.store.id}
            onCheckIn={() => {
              void handleAskCheckIn();
            }}
            onCompleteVisit={() => {
              handleCompleteCurrentVisit(currentRow);
            }}
            onOpenStore={() => {
              handleOpenStore(currentRow.store.id);
            }}
            onUndoCheckIn={
              currentRow.visit.status === 'checked_in'
                ? () => {
                    onUndoCheckIn(currentRow.visit.id);
                  }
                : undefined
            }
            showAskPrompt={showAskPrompt}
            store={currentRow.store}
            viewModel={currentViewModel}
            visitCheckedInAt={currentRow.visit.checkedInAt}
            visitStatus={currentRow.visit.status}
          />
        </View>
      ) : null}

      {pendingStopRows.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pending Stops</Text>
          {pendingStopRows.map((row) => {
            if (row.visit.id === nextVisitId) {
              return (
                <UpNextStopCard
                  key={row.visit.id}
                  isMapHighlighted={highlightedStoreId === row.store.id}
                  onPress={() => {
                    handleOpenStore(row.store.id);
                  }}
                  viewModel={buildRowViewModel(row, viewModelInput)}
                />
              );
            }

            return renderStaticStopCard(row);
          })}
        </View>
      ) : null}

      {completedRows.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Completed</Text>
          </View>
          {completedRows.map((row) => (
            <CompletedStopCard
              key={row.visit.id}
              isMapHighlighted={highlightedStoreId === row.store.id}
              onPress={() => {
                handleOpenStore(row.store.id);
              }}
              viewModel={buildRowViewModel(row, viewModelInput)}
            />
          ))}
        </View>
      ) : null}

      {skippedRows.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Skipped</Text>
          {skippedRows.map((row) => {
            const state = resolveLiveStopPresentationState({
              currentVisitId,
              visit: row.visit,
            });
            const viewModel = buildRowViewModel(row, viewModelInput);

            return (
              <LiveStopCard
                activeDisplayStatus="skipped"
                isMapHighlighted={highlightedStoreId === row.store.id}
                key={row.visit.id}
                onPress={() => {
                  handleOpenStore(row.store.id);
                }}
                state={state}
                viewModel={viewModel}
                visit={row.visit}
              />
            );
          })}
        </View>
      ) : null}

      <RouteEndpointCard kind="finish" location={finishLocation} locked />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: LiveRouteLayout.headerToStopsGap,
    width: '100%',
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  heading: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: PlanningLayout.sectionTitleSize,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  menuButtonDisabled: {
    opacity: 0.45,
  },
  menuButtonPressed: {
    opacity: 0.85,
  },
  editToggleButton: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
  editToggleLabel: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '800',
  },
  editToggleDone: {
    backgroundColor: AppColors.blue,
    borderColor: AppColors.blue,
  },
  editToggleDoneLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    gap: 8,
    width: '100%',
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  draggableList: {
    flexGrow: 0,
    width: '100%',
  },
});
