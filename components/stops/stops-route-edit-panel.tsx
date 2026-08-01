import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  NestableDraggableFlatList,
  OpacityDecorator,
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import type { WithSpringConfig } from 'react-native-reanimated';

import {
  formatPlanningStopAddressLine,
  formatPlanningStopDisplay,
} from '@/components/coordinator/planning-address-display';
import { ActiveWorkdayReorderLayout } from '@/components/coordinator/active-workday-reorder-layout';
import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { RouteEndpointCard } from '@/components/coordinator/route-endpoint-card';
import { ActiveWorkdayRouteAnchorCard } from '@/components/coordinator/active-workday-route-anchor-card';
import { RouteEditLockedRow } from '@/components/stops/route-edit-locked-row';
import { RouteEditPendingRow } from '@/components/stops/route-edit-pending-row';
import {
  ActiveWorkdayReorderStopRow,
} from '@/components/stops/active-workday-reorder-stop-row';
import {
  isVisitCheckedInForActiveWorkdayReorder,
  resolveNextStopVisitIdForActiveWorkdayReorder,
} from '@/utils/active-workday-route-origin';
import { CompletedStopCard } from '@/components/stops/completed-stop-card';
import { closeAllSwipeActions, SwipeActionRow } from '@/components/shared/swipe-action-row';
import { AppColors } from '@/components/shared/app-theme';
import { useGestureInteractionCleanup } from '@/hooks/use-gesture-interaction-cleanup';
import {
  getFinishLocation,
  getStartLocation,
} from '@/utils/route-state';
import {
  canRemoveVisitDuringActiveRoute,
  canReorderVisitDuringActiveRoute,
  isVisitLockedDuringActiveRoute,
} from '@/utils/active-route-editing';
import { setGestureDebugDragItem } from '@/utils/gesture-interaction-debug';
import { syncDraggableStopRows } from '@/utils/sync-draggable-stop-rows';
import { buildFullOrderFromPendingReorder } from '@/services/route-edit-commands';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { resolveNextVisit } from '@/services/store-visits';
import {
  buildRouteStoreCardViewModel,
  mapLiveStopStateToVariant,
} from '@/utils/route-store-card-model';
import { resolveLiveStopPresentationState } from '@/utils/live-route-summary';

const LONG_PRESS_DELAY_MS = 250;

/** Tighter springs for cell shift and drop snap (library default is bouncier). */
const STOPS_EDIT_DRAG_ANIMATION_CONFIG: Partial<WithSpringConfig> = {
  damping: 32,
  mass: 0.12,
  stiffness: 280,
  overshootClamping: true,
};

function lockedStatusLabel(status: StoreVisit['status']): string {
  switch (status) {
    case 'current':
      return 'Current';
    case 'checked_in':
      return 'Checked in';
    case 'completed':
      return 'Completed';
    case 'skipped':
      return 'Skipped';
    default:
      return 'Locked';
  }
}

function stopDisplayName(store: Store): string {
  return formatPlanningStopDisplay(store).title;
}

type EditRow = {
  visit: StoreVisit;
  store: Store;
};

type StopsRouteEditPanelProps = {
  currentVisitId: string | null;
  draft: RoutePlanningDraft;
  onHighlightStop?: (storeId: string) => void;
  onPressStop: (storeId: string) => void;
  onRemove: (visitId: string, stopName: string) => void;
  onReorder: (orderedVisitIds: string[]) => void;
  presentation?: 'default' | 'activeWorkday';
  storesById: Record<string, Store>;
  visits: StoreVisit[];
};

export function StopsRouteEditPanel({
  currentVisitId,
  draft,
  onHighlightStop,
  onPressStop,
  onRemove,
  onReorder,
  presentation = 'default',
  storesById,
  visits,
}: StopsRouteEditPanelProps) {
  useGestureInteractionCleanup('Today/StopsEdit');

  const isActiveWorkdayPresentation = presentation === 'activeWorkday';

  const startLocation = useMemo(() => getStartLocation(draft), [draft]);
  const finishLocation = useMemo(() => getFinishLocation(draft), [draft]);

  const rowsFromProps = useMemo(() => {
    return [...visits]
      .sort((left, right) => left.routeOrder - right.routeOrder)
      .flatMap((visit) => {
        const store = storesById[visit.storeId];
        return store ? [{ visit, store }] : [];
      });
  }, [storesById, visits]);

  const lockedRows = useMemo(
    () => rowsFromProps.filter((row) => isVisitLockedDuringActiveRoute(row.visit)),
    [rowsFromProps],
  );

  const editableRowsFromProps = useMemo(
    () => rowsFromProps.filter((row) => !isVisitLockedDuringActiveRoute(row.visit)),
    [rowsFromProps],
  );

  const [editableRows, setEditableRows] = useState(editableRowsFromProps);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isDragging) {
      return;
    }

    setEditableRows((current) =>
      syncDraggableStopRows(current, editableRowsFromProps, {
        sameRowContent: (left, right) =>
          left.store.id === right.store.id &&
          left.store.updatedAt === right.store.updatedAt,
      }),
    );
  }, [editableRowsFromProps, isDragging]);

  const finishDrag = useCallback(() => {
    setIsDragging(false);
    setGestureDebugDragItem(null);
  }, []);

  useEffect(() => {
    return () => {
      finishDrag();
      closeAllSwipeActions();
    };
  }, [finishDrag]);

  const nextPendingVisitId = useMemo(() => {
    if (isActiveWorkdayPresentation) {
      return resolveNextStopVisitIdForActiveWorkdayReorder(visits);
    }

    const currentVisit =
      currentVisitId !== null
        ? visits.find((visit) => visit.id === currentVisitId) ?? null
        : null;

    const nextVisit = resolveNextVisit(visits, currentVisit);

    return nextVisit?.status === 'pending' ? nextVisit.id : null;
  }, [currentVisitId, isActiveWorkdayPresentation, visits]);

  function handleOpenStore(storeId: string) {
    onHighlightStop?.(storeId);
    onPressStop(storeId);
  }

  function handleEditableReorder(nextRows: EditRow[]) {
    setEditableRows(nextRows);
    onReorder(buildFullOrderFromPendingReorder(visits, nextRows.map((row) => row.visit)));
  }

  function renderLockedRow(row: EditRow) {
    const { visit, store } = row;

    if (visit.status === 'completed') {
      const state = resolveLiveStopPresentationState({
        currentVisitId,
        visit,
      });
      const variant = mapLiveStopStateToVariant(state, {
        currentVisitId,
        nextVisitId: nextPendingVisitId,
        visitId: visit.id,
      });
      const viewModel = buildRouteStoreCardViewModel({
        currentVisitId,
        delivery: null,
        nextVisitId: nextPendingVisitId,
        store,
        variant,
        visit,
        visits,
        storesById,
      });

      return (
        <CompletedStopCard
          compact={isActiveWorkdayPresentation}
          key={visit.id}
          onPress={() => {
            handleOpenStore(store.id);
          }}
          viewModel={viewModel}
        />
      );
    }

    const name = stopDisplayName(store);

    return (
      <RouteEditLockedRow
        key={visit.id}
        onPress={() => {
          handleOpenStore(store.id);
        }}
        status={visit.status}
        statusLabel={lockedStatusLabel(visit.status)}
        stopNumber={visit.routeOrder}
        storeName={name}
      />
    );
  }

  function renderDragPlaceholder({ item }: { item: EditRow; index: number }) {
    const name = stopDisplayName(item.store);

    return (
      <View
        accessibilityLabel={`Drop zone for ${name}`}
        style={[
          styles.dragPlaceholder,
          isActiveWorkdayPresentation
            ? styles.dragPlaceholderActiveWorkday
            : styles.dragPlaceholderDefault,
        ]}
      />
    );
  }

  function renderPendingItem({ drag, isActive, item }: RenderItemParams<EditRow>) {
    const { visit, store } = item;
    const name = stopDisplayName(store);
    const addressLine = formatPlanningStopAddressLine(store);
    const canDrag = canReorderVisitDuringActiveRoute(visit);
    const canRemove = canRemoveVisitDuringActiveRoute(visit);

    return (
      <SwipeActionRow
        actionBorderRadius={PlanningLayout.cardRadius}
        enabled={!isDragging && canRemove}
        rowId={visit.id}
        rowSpacing={isActiveWorkdayPresentation ? ActiveWorkdayReorderLayout.rowGap : LiveRouteLayout.stopGap}
        rightAction={{
          accessibilityLabel: `Remove ${name} from route`,
          backgroundColor: AppColors.red,
          label: 'Remove',
          onPress: () => {
            onRemove(visit.id, name);
          },
        }}
      >
        <OpacityDecorator activeOpacity={0.96}>
          <ScaleDecorator activeScale={1.01}>
            {isActiveWorkdayPresentation ? (
              <ActiveWorkdayReorderStopRow
                addressLine={addressLine}
                delayLongPress={LONG_PRESS_DELAY_MS}
                isActive={isActive}
                isCurrentStop={isVisitCheckedInForActiveWorkdayReorder(visit)}
                isNextInRoute={visit.id === nextPendingVisitId}
                isSkipped={visit.status === 'skipped'}
                onLongPress={
                  canDrag && !isActive
                    ? () => {
                        closeAllSwipeActions();
                        drag();
                      }
                    : undefined
                }
                onPress={() => {
                  handleOpenStore(store.id);
                }}
                stopNumber={visit.routeOrder}
                storeName={name}
              />
            ) : (
              <RouteEditPendingRow
                addressLine={addressLine}
                delayLongPress={LONG_PRESS_DELAY_MS}
                isActive={isActive}
                isNextInRoute={visit.id === nextPendingVisitId}
                onLongPress={
                  canDrag && !isActive
                    ? () => {
                        closeAllSwipeActions();
                        drag();
                      }
                    : undefined
                }
                onPress={() => {
                  handleOpenStore(store.id);
                }}
                stopNumber={visit.routeOrder}
                storeName={name}
              />
            )}
          </ScaleDecorator>
        </OpacityDecorator>
      </SwipeActionRow>
    );
  }

  return (
    <View style={[styles.container, isActiveWorkdayPresentation && styles.containerActiveWorkday]}>
      {isActiveWorkdayPresentation ? (
        <ActiveWorkdayRouteAnchorCard kind="start" location={startLocation} />
      ) : (
        <RouteEndpointCard kind="start" location={startLocation} locked />
      )}

      {lockedRows.length > 0 ? (
        <View style={[styles.section, isActiveWorkdayPresentation && styles.sectionActiveWorkday]}>
          <Text style={[styles.sectionLabel, isActiveWorkdayPresentation && styles.sectionLabelActiveWorkday]}>
            Completed
          </Text>
          {lockedRows.map((row) => renderLockedRow(row))}
        </View>
      ) : null}

      {editableRows.length > 0 ? (
        <View style={[styles.section, isActiveWorkdayPresentation && styles.sectionActiveWorkday]}>
          {!isActiveWorkdayPresentation ? (
            <>
              <Text style={styles.sectionLabel}>Reorder stops</Text>
              <Text style={styles.sectionHint}>Drag to reorder — completed stops stay fixed</Text>
            </>
          ) : null}
          <NestableDraggableFlatList
            activationDistance={20}
            animationConfig={STOPS_EDIT_DRAG_ANIMATION_CONFIG}
            autoscrollSpeed={100}
            autoscrollThreshold={30}
            containerStyle={styles.draggableList}
            data={editableRows}
            dragItemOverflow
            keyExtractor={(item) => item.visit.id}
            onDragBegin={(index) => {
              closeAllSwipeActions();
              setIsDragging(true);
              const row = editableRows[index];

              if (row) {
                setGestureDebugDragItem(row.visit.id);
              }

              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onDragEnd={({ data: nextRows }) => {
              finishDrag();
              handleEditableReorder(nextRows);
            }}
            onRelease={finishDrag}
            renderItem={renderPendingItem}
            renderPlaceholder={renderDragPlaceholder}
            scrollEnabled={false}
          />
        </View>
      ) : (
        <Text style={styles.emptyPending}>No stops to reorder.</Text>
      )}

      {isActiveWorkdayPresentation ? (
        <ActiveWorkdayRouteAnchorCard kind="finish" location={finishLocation} />
      ) : (
        <RouteEndpointCard kind="finish" location={finishLocation} locked />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: LiveRouteLayout.headerToStopsGap,
    width: '100%',
  },
  containerActiveWorkday: {
    gap: ActiveWorkdayReorderLayout.sectionGap,
  },
  section: {
    gap: 8,
    width: '100%',
  },
  sectionActiveWorkday: {
    gap: 6,
  },
  sectionLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionLabelActiveWorkday: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sectionHint: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: -4,
  },
  draggableList: {
    flexGrow: 0,
    width: '100%',
  },
  emptyPending: {
    color: AppColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  dragPlaceholder: {
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    borderColor: 'rgba(37, 99, 235, 0.28)',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flex: 1,
    width: '100%',
  },
  dragPlaceholderDefault: {
    borderRadius: PlanningLayout.cardRadius,
    minHeight: 56,
  },
  dragPlaceholderActiveWorkday: {
    borderRadius: 14,
    minHeight: ActiveWorkdayReorderLayout.stopRowMinHeight,
  },
});
