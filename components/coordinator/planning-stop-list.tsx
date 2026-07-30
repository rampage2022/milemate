import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  NestableDraggableFlatList,
  OpacityDecorator,
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { closeAllSwipeActions, SwipeActionRow } from '@/components/shared/swipe-action-row';
import { AppColors } from '@/components/shared/app-theme';
import { useGestureInteractionCleanup } from '@/hooks/use-gesture-interaction-cleanup';
import {
  canRemoveVisitDuringActiveRoute,
  canReorderVisitDuringActiveRoute,
} from '@/utils/active-route-editing';
import { setGestureDebugDragItem } from '@/utils/gesture-interaction-debug';
import { syncDraggableStopRows } from '@/utils/sync-draggable-stop-rows';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

const LONG_PRESS_DELAY_MS = 400;

type PlanningStopListProps = {
  duringActiveWorkday?: boolean;
  onPressStop: (storeId: string) => void;
  onRemove: (visitId: string, stopName: string) => void;
  onReorder: (orderedVisitIds: string[]) => void;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
};

type PlanningStopRow = {
  visit: StoreVisit;
  name: string;
  address: string;
};

function toPlanningStopRows(
  visits: StoreVisit[],
  storesById: Record<string, Store>,
): PlanningStopRow[] {
  return [...visits]
    .sort((left, right) => left.routeOrder - right.routeOrder)
    .map((visit) => {
      const store = storesById[visit.storeId];
      const display = store
        ? formatPlanningStopDisplay(store)
        : { title: 'Stop', subtitle: 'Address unavailable' };

      return {
        visit,
        name: display.title,
        address: display.subtitle,
      };
    });
}

export function PlanningStopList({
  duringActiveWorkday = false,
  onPressStop,
  onRemove,
  onReorder,
  storesById,
  visits,
}: PlanningStopListProps) {
  useGestureInteractionCleanup('Today/PlanningStops');

  const rowsFromProps = useMemo(
    () => toPlanningStopRows(visits, storesById),
    [storesById, visits],
  );
  const [rows, setRows] = useState(rowsFromProps);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isDragging) {
      return;
    }

    setRows((current) =>
      syncDraggableStopRows(current, rowsFromProps, {
        sameRowContent: (left, right) =>
          left.name === right.name && left.address === right.address,
      }),
    );
  }, [isDragging, rowsFromProps]);

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

  function canDragRow(visit: StoreVisit): boolean {
    if (!duringActiveWorkday) {
      return true;
    }

    return canReorderVisitDuringActiveRoute(visit);
  }

  function canRemoveRow(visit: StoreVisit): boolean {
    if (!duringActiveWorkday) {
      return true;
    }

    return canRemoveVisitDuringActiveRoute(visit);
  }

  function renderItem({
    drag,
    getIndex,
    isActive,
    item,
  }: RenderItemParams<PlanningStopRow>) {
    const index = getIndex() ?? 0;
    const canDrag = canDragRow(item.visit);
    const canRemove = canRemoveRow(item.visit);

    return (
      <SwipeActionRow
        actionBorderRadius={PlanningLayout.cardRadius}
        enabled={!isDragging && canRemove}
        rowId={item.visit.id}
        rowSpacing={PlanningLayout.stopGap}
        rightAction={{
          accessibilityLabel: `Remove ${item.name} from route`,
          backgroundColor: AppColors.red,
          label: 'Remove',
          onPress: () => {
            onRemove(item.visit.id, item.name);
          },
        }}
      >
        <OpacityDecorator activeOpacity={0.96}>
          <ScaleDecorator activeScale={1.01}>
            <Pressable
              accessibilityHint={
                canDrag
                  ? 'Press and hold, then drag to reorder'
                  : 'This stop cannot be moved during your active route'
              }
              accessibilityLabel={`Stop ${index + 1}, ${item.name}`}
              accessibilityRole="button"
              delayLongPress={LONG_PRESS_DELAY_MS}
              disabled={isActive}
              onLongPress={
                canDrag && !isActive
                  ? () => {
                      closeAllSwipeActions();
                      drag();
                    }
                  : undefined
              }
              onPress={() => {
                onPressStop(item.visit.storeId);
              }}
              style={[styles.row, isActive && styles.rowActive]}
            >
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.name}>
                  {item.name}
                </Text>
                {item.address.length > 0 ? (
                  <Text numberOfLines={2} style={styles.address}>
                    {item.address}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.order}>{index + 1}</Text>
              <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
            </Pressable>
          </ScaleDecorator>
        </OpacityDecorator>
      </SwipeActionRow>
    );
  }

  return (
    <NestableDraggableFlatList
      activationDistance={12}
      autoscrollSpeed={150}
      autoscrollThreshold={80}
      containerStyle={styles.list}
      data={rows}
      dragItemOverflow
      keyExtractor={(item) => item.visit.id}
      onDragBegin={(index) => {
        closeAllSwipeActions();
        setIsDragging(true);
        const row = rows[index];

        if (row) {
          setGestureDebugDragItem(row.visit.id);
        }

        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onDragEnd={({ data: nextRows }) => {
        finishDrag();
        setRows(nextRows);
        onReorder(nextRows.map((row) => row.visit.id));
      }}
      onRelease={finishDrag}
      renderItem={renderItem}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: 'stretch',
    flexGrow: 0,
    width: '100%',
  },
  row: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: PlanningLayout.cardPaddingH,
    paddingVertical: PlanningLayout.cardPaddingV,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    width: '100%',
  },
  rowActive: {
    borderColor: AppColors.blue,
  },
  order: {
    color: AppColors.textMuted,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    width: 18,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 44,
  },
  name: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
});
