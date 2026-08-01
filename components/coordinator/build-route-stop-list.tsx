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

import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import { closeAllSwipeActions, SwipeActionRow } from '@/components/shared/swipe-action-row';
import { AppColors } from '@/components/shared/app-theme';
import { useGestureInteractionCleanup } from '@/hooks/use-gesture-interaction-cleanup';
import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { resolveAddStopStoreIcon } from '@/utils/add-stop-store-icon';
import { distanceMiles } from '@/utils/distance';
import { setGestureDebugDragItem } from '@/utils/gesture-interaction-debug';
import { syncDraggableStopRows } from '@/utils/sync-draggable-stop-rows';

const LONG_PRESS_DELAY_MS = 400;
const ROW_GAP = BuildRouteLayout.routeListConnectedGap;

type BuildRouteStopListProps = {
  onPressStop: (storeId: string) => void;
  onRemove: (visitId: string, stopName: string) => void;
  onReorder: (orderedVisitIds: string[]) => void;
  startLocation: RouteLocation | null;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
};

type BuildRouteStopRow = {
  address: string;
  legDistanceLabel: string | null;
  name: string;
  visit: StoreVisit;
};

function coordinateFromStore(store: Store | undefined): { latitude: number; longitude: number } | null {
  if (
    !store ||
    typeof store.latitude !== 'number' ||
    typeof store.longitude !== 'number' ||
    !Number.isFinite(store.latitude) ||
    !Number.isFinite(store.longitude)
  ) {
    return null;
  }

  return { latitude: store.latitude, longitude: store.longitude };
}

function formatLegDistanceLabel(miles: number | null): string | null {
  if (miles === null || !Number.isFinite(miles)) {
    return null;
  }

  return `${miles.toFixed(1)} mi`;
}

function toBuildRouteStopRows(input: {
  startLocation: RouteLocation | null;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
}): BuildRouteStopRow[] {
  const sorted = [...input.visits].sort((left, right) => left.routeOrder - right.routeOrder);
  let previous =
    input.startLocation &&
    Number.isFinite(input.startLocation.latitude) &&
    Number.isFinite(input.startLocation.longitude)
      ? {
          latitude: input.startLocation.latitude,
          longitude: input.startLocation.longitude,
        }
      : null;

  return sorted.map((visit) => {
    const store = input.storesById[visit.storeId];
    const display = store
      ? formatPlanningStopDisplay(store)
      : { title: 'Stop', subtitle: 'Address unavailable' };
    const current = coordinateFromStore(store);
    let legDistanceLabel: string | null = null;

    if (previous && current) {
      legDistanceLabel = formatLegDistanceLabel(distanceMiles(previous, current));
    }

    if (current) {
      previous = current;
    }

    return {
      address: display.subtitle,
      legDistanceLabel,
      name: display.title,
      visit,
    };
  });
}

function StopBrandIcon({ name }: { name: string }) {
  const spec = resolveAddStopStoreIcon(name);

  return (
    <View style={[styles.brandIcon, { backgroundColor: spec.backgroundColor }]}>
      {spec.label ? (
        <Text style={styles.brandLetter}>{spec.label}</Text>
      ) : (
        <Ionicons color={spec.glyphColor} name={spec.glyph} size={15} />
      )}
    </View>
  );
}

export function BuildRouteStopList({
  onPressStop,
  onRemove,
  onReorder,
  startLocation,
  storesById,
  visits,
}: BuildRouteStopListProps) {
  useGestureInteractionCleanup('BuildRoute/PlanningStops');

  const rowsFromProps = useMemo(
    () => toBuildRouteStopRows({ startLocation, storesById, visits }),
    [startLocation, storesById, visits],
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
          left.name === right.name &&
          left.address === right.address &&
          left.legDistanceLabel === right.legDistanceLabel,
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

  function renderItem({ drag, getIndex, isActive, item }: RenderItemParams<BuildRouteStopRow>) {
    const index = getIndex() ?? 0;
    const stopNumber = index + 1;

    return (
      <SwipeActionRow
        actionBorderRadius={BuildRouteLayout.cardRadius}
        enabled={!isDragging}
        rowId={item.visit.id}
        rowSpacing={ROW_GAP}
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
            <View style={[styles.row, isActive && styles.rowActive]}>
              <Pressable
                accessibilityLabel={`Reorder stop ${stopNumber}`}
                accessibilityRole="button"
                delayLongPress={LONG_PRESS_DELAY_MS}
                hitSlop={8}
                onLongPress={() => {
                  closeAllSwipeActions();
                  drag();
                }}
                style={styles.dragHandle}
              >
                <Ionicons color={AppColors.textMuted} name="reorder-three" size={18} />
              </Pressable>

              <View style={styles.numberRing}>
                <Text style={styles.numberText}>{stopNumber}</Text>
              </View>

              <StopBrandIcon name={item.name} />

              <Pressable
                accessibilityLabel={`Stop ${stopNumber}, ${item.name}`}
                accessibilityRole="button"
                onPress={() => {
                  onPressStop(item.visit.storeId);
                }}
                style={styles.copyPressable}
              >
                <Text numberOfLines={1} style={styles.name}>
                  {item.name}
                </Text>
                {item.address.length > 0 ? (
                  <View style={styles.addressBlock}>
                    <Text numberOfLines={2} style={styles.address}>
                      {item.address}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.addressBlock} />
                )}
              </Pressable>

              <View style={styles.distanceColumn}>
                {item.legDistanceLabel ? (
                  <Text numberOfLines={1} style={styles.legDistance}>
                    {item.legDistanceLabel}
                  </Text>
                ) : null}
              </View>
            </View>
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
    borderRadius: BuildRouteLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    minHeight: BuildRouteLayout.routeListRowHeight,
    paddingHorizontal: BuildRouteLayout.cardPaddingH,
    paddingVertical: 8,
    width: '100%',
  },
  rowActive: {
    borderColor: AppColors.blue,
  },
  dragHandle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    width: 20,
  },
  numberRing: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  brandIcon: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  brandLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  copyPressable: {
    flex: 1,
    gap: 1,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 0,
    paddingRight: 4,
  },
  name: {
    color: AppColors.textPrimary,
    fontSize: BuildRouteLayout.stopNameSize,
    fontWeight: '700',
  },
  addressBlock: {
    justifyContent: 'center',
    minHeight: 36,
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: BuildRouteLayout.stopAddressSize,
    lineHeight: 18,
  },
  distanceColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 36,
    width: 52,
  },
  legDistance: {
    color: AppColors.blue,
    fontSize: BuildRouteLayout.legDistanceSize,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    maxWidth: 52,
    textAlign: 'right',
  },
});
