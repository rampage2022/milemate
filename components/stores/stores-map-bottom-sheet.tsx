import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppColors } from '@/components/shared/app-theme';
import { StoresList } from '@/components/stores/stores-list';
import { StoresMapSheetControls } from '@/components/stores/stores-map-sheet-controls';
import {
  clampStoresMapSheetTranslateY,
  selectStoresMapSheetSnapFromGesture,
  translateYForStoresMapSheetSnap,
  type StoresMapSheetSnap,
  type StoresMapSheetSnapGeometry,
} from '@/components/stores/stores-map-sheet-snap';
import type { StoresScope } from '@/components/stores/stores-screen';
import type { StoreListItem } from '@/hooks/use-stores-screen-data';
import type { Store } from '@/types/store';
import type { StoresMapCounts, StoresMapFilterChipModel } from '@/utils/stores-map-model';
import { StoresMapQuickFilterRow, applyQuickSmartFilterToggle } from '@/components/stores/stores-map-quick-filter-row';
import type { StoresMapFilterState } from '@/utils/stores-map-filter-state';
import type { StoresMapSmartFilterId } from '@/utils/stores-map-smart-filter-index';
import {
  formatStoresMapSheetCollapsedLine,
  formatStoresMapSheetCollapsedMetaLine,
  STORES_MAP_SHEET_COLLAPSED_DRAG_PADDING_BOTTOM,
  STORES_MAP_SHEET_COLLAPSED_DRAG_PADDING_TOP,
  STORES_MAP_SHEET_COLLAPSED_HANDLE_HEIGHT,
  STORES_MAP_SHEET_COLLAPSED_HORIZONTAL_PADDING,
  STORES_MAP_SHEET_COLLAPSED_META_LINE_HEIGHT,
  STORES_MAP_SHEET_COLLAPSED_SUMMARY_LINE_HEIGHT,
  STORES_MAP_SHEET_COLLAPSED_TEXT_GAP,
  shouldStoresMapSheetPanFromListContent,
} from '@/utils/stores-map-sheet-layout';

const SHEET_SPRING = {
  damping: 28,
  mass: 0.35,
  overshootClamping: true,
  stiffness: 320,
};

type StoresMapBottomSheetProps = {
  browseCollapsedChromeHidden: boolean;
  collapsedPrimaryLine: string;
  counts: StoresMapCounts;
  deleteEnabled: boolean;
  filterState: StoresMapFilterState;
  geometry: StoresMapSheetSnapGeometry;
  groupChips: StoresMapFilterChipModel[];
  items: StoreListItem[];
  listEmptyComponent: ReactElement | null;
  membershipLabelForStore: (storeId: string) => string | null;
  onClearAllFilters: () => void;
  onClearSearch: () => void;
  onDeleteStore: (store: Store) => void;
  onFilterChipPress: (filterId: string) => void;
  onFilterStateChange: (state: StoresMapFilterState) => void;
  onOpenStore: (storeId: string) => void;
  onRestingSnapChange?: (snap: StoresMapSheetSnap) => void;
  onScopeChange: (scope: StoresScope) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectStore: (storeId: string) => void;
  scope: StoresScope;
  searchQuery: string;
  selectedStoreId: string | null;
  smartChips: StoresMapFilterChipModel[];
  workdayChips: StoresMapFilterChipModel[];
};

export function StoresMapBottomSheet({
  browseCollapsedChromeHidden,
  collapsedPrimaryLine,
  counts,
  deleteEnabled,
  filterState,
  geometry,
  groupChips,
  items,
  listEmptyComponent,
  membershipLabelForStore,
  onClearAllFilters,
  onClearSearch,
  onDeleteStore,
  onFilterChipPress,
  onFilterStateChange,
  onOpenStore,
  onRestingSnapChange,
  onScopeChange,
  onSearchQueryChange,
  onSelectStore,
  scope,
  searchQuery,
  selectedStoreId,
  smartChips,
  workdayChips,
}: StoresMapBottomSheetProps) {
  const [restingSnap, setRestingSnap] = useState<StoresMapSheetSnap>('collapsed');

  const translateY = useSharedValue(geometry.snapTranslateY.collapsed);
  const panStartY = useSharedValue(geometry.snapTranslateY.collapsed);
  const maxTranslateY = useSharedValue(geometry.maxTranslateY);
  const snapExpandedY = useSharedValue(geometry.snapTranslateY.expanded);
  const snapMediumY = useSharedValue(geometry.snapTranslateY.medium);
  const snapCollapsedY = useSharedValue(geometry.snapTranslateY.collapsed);
  const listScrollY = useSharedValue(0);
  const listTakeoverArmed = useSharedValue(0);

  const collapsedLine = formatStoresMapSheetCollapsedLine(scope, collapsedPrimaryLine);
  const collapsedMetaLine = formatStoresMapSheetCollapsedMetaLine({
    missingLocation: counts.missingLocation,
    onMap: counts.onMap,
  });

  const commitRestingSnap = useCallback(
    (snap: StoresMapSheetSnap) => {
      setRestingSnap(snap);
      onRestingSnapChange?.(snap);

      if (__DEV__) {
        console.log('[StoresMapSheet] resting snap:', snap);
      }
    },
    [onRestingSnapChange],
  );

  const logListTakeover = useCallback(() => {
    if (__DEV__) {
      console.log('[StoresMapSheet] list-at-top sheet takeover');
    }
  }, []);

  const animateToSnap = useCallback(
    (snap: StoresMapSheetSnap) => {
      const targetY = geometry.snapTranslateY[snap];
      translateY.value = withSpring(targetY, SHEET_SPRING);
      panStartY.value = targetY;
      setRestingSnap(snap);
      onRestingSnapChange?.(snap);
    },
    [geometry.snapTranslateY, onRestingSnapChange, panStartY, translateY],
  );

  const handleQuickSmartToggle = useCallback(
    (filterId: StoresMapSmartFilterId) => {
      onFilterStateChange(applyQuickSmartFilterToggle(filterState, filterId));
    },
    [filterState, onFilterStateChange],
  );

  const handleMoreFilters = useCallback(() => {
    animateToSnap('medium');
  }, [animateToSnap]);

  useEffect(() => {
    maxTranslateY.value = geometry.maxTranslateY;
    snapExpandedY.value = geometry.snapTranslateY.expanded;
    snapMediumY.value = geometry.snapTranslateY.medium;
    snapCollapsedY.value = geometry.snapTranslateY.collapsed;

    const targetY = geometry.snapTranslateY[restingSnap];
    translateY.value = clampStoresMapSheetTranslateY(
      targetY,
      geometry.snapTranslateY.expanded,
      geometry.maxTranslateY,
    );
    panStartY.value = translateY.value;
  }, [
    geometry,
    maxTranslateY,
    panStartY,
    restingSnap,
    snapCollapsedY,
    snapExpandedY,
    snapMediumY,
    translateY,
  ]);

  useEffect(() => {
    if (browseCollapsedChromeHidden) {
      animateToSnap('collapsed');
    }
  }, [animateToSnap, browseCollapsedChromeHidden]);

  const handlePanGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .onBegin(() => {
          panStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          const nextY = panStartY.value + event.translationY;
          translateY.value = clampStoresMapSheetTranslateY(
            nextY,
            snapExpandedY.value,
            maxTranslateY.value,
          );
        })
        .onEnd((event) => {
          const snap = selectStoresMapSheetSnapFromGesture({
            allowExpanded: 1,
            snapCollapsedY: snapCollapsedY.value,
            snapExpandedY: snapExpandedY.value,
            snapMediumY: snapMediumY.value,
            translateY: translateY.value,
            velocityY: event.velocityY,
          });
          const targetY = translateYForStoresMapSheetSnap({
            snap,
            snapCollapsedY: snapCollapsedY.value,
            snapExpandedY: snapExpandedY.value,
            snapMediumY: snapMediumY.value,
          });

          translateY.value = withSpring(targetY, SHEET_SPRING);
          panStartY.value = targetY;
          listTakeoverArmed.value = 0;
          runOnJS(commitRestingSnap)(snap);
        })
        .onFinalize(() => {
          translateY.value = clampStoresMapSheetTranslateY(
            translateY.value,
            snapExpandedY.value,
            maxTranslateY.value,
          );
          panStartY.value = translateY.value;
          listTakeoverArmed.value = 0;
        }),
    [
      commitRestingSnap,
      listTakeoverArmed,
      maxTranslateY,
      panStartY,
      snapCollapsedY,
      snapExpandedY,
      snapMediumY,
      translateY,
    ],
  );

  const listPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .activeOffsetY(8)
        .failOffsetY(-8)
        .onTouchesMove((_, state) => {
          if (shouldStoresMapSheetPanFromListContent(listScrollY.value)) {
            state.activate();
          } else {
            state.fail();
          }
        })
        .onBegin(() => {
          panStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          if (!shouldStoresMapSheetPanFromListContent(listScrollY.value)) {
            return;
          }

          if (event.translationY > 0 && listTakeoverArmed.value === 0) {
            listTakeoverArmed.value = 1;
            runOnJS(logListTakeover)();
          }

          const nextY = panStartY.value + event.translationY;
          translateY.value = clampStoresMapSheetTranslateY(
            nextY,
            snapExpandedY.value,
            maxTranslateY.value,
          );
        })
        .onEnd((event) => {
          if (!shouldStoresMapSheetPanFromListContent(listScrollY.value)) {
            listTakeoverArmed.value = 0;
            return;
          }

          const snap = selectStoresMapSheetSnapFromGesture({
            allowExpanded: 1,
            snapCollapsedY: snapCollapsedY.value,
            snapExpandedY: snapExpandedY.value,
            snapMediumY: snapMediumY.value,
            translateY: translateY.value,
            velocityY: event.velocityY,
          });
          const targetY = translateYForStoresMapSheetSnap({
            snap,
            snapCollapsedY: snapCollapsedY.value,
            snapExpandedY: snapExpandedY.value,
            snapMediumY: snapMediumY.value,
          });

          translateY.value = withSpring(targetY, SHEET_SPRING);
          panStartY.value = targetY;
          listTakeoverArmed.value = 0;
          runOnJS(commitRestingSnap)(snap);
        })
        .onFinalize(() => {
          translateY.value = clampStoresMapSheetTranslateY(
            translateY.value,
            snapExpandedY.value,
            maxTranslateY.value,
          );
          panStartY.value = translateY.value;
          listTakeoverArmed.value = 0;
        }),
    [
      commitRestingSnap,
      listScrollY,
      listTakeoverArmed,
      logListTakeover,
      maxTranslateY,
      panStartY,
      snapCollapsedY,
      snapExpandedY,
      snapMediumY,
      translateY,
    ],
  );

  const listGesture = useMemo(
    () => Gesture.Simultaneous(Gesture.Native(), listPanGesture),
    [listPanGesture],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: clampStoresMapSheetTranslateY(
          translateY.value,
          snapExpandedY.value,
          maxTranslateY.value,
        ),
      },
    ],
  }));

  const listBlock = (
    <GestureDetector gesture={listGesture}>
      <View style={styles.listRegion}>
        <StoresList
          deleteEnabled={deleteEnabled}
          items={items}
          listEmptyComponent={listEmptyComponent}
          listScrollY={listScrollY}
          listContentBottomPadding={12}
          membershipLabelForStore={membershipLabelForStore}
          onDeleteStore={onDeleteStore}
          onOpenStore={onOpenStore}
          onSelectStore={onSelectStore}
          selectedStoreId={selectedStoreId}
          useGestureHandlerFlatList
        />
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          height: geometry.expandedHeight,
        },
        sheetStyle,
      ]}
    >
      <View pointerEvents="auto" style={[styles.sheet, { height: geometry.expandedHeight }]}>
        <GestureDetector gesture={handlePanGesture}>
          <View
            style={
              browseCollapsedChromeHidden && restingSnap === 'collapsed'
                ? styles.dragRegionHidden
                : styles.dragRegion
            }
          >
            {browseCollapsedChromeHidden && restingSnap === 'collapsed' ? null : (
              <>
                <View accessibilityRole="adjustable" style={styles.handleTrack}>
                  <View style={styles.handle} />
                </View>
                {restingSnap === 'collapsed' && !browseCollapsedChromeHidden ? (
                  <>
                    <Text allowFontScaling numberOfLines={1} style={styles.summaryLine}>
                      {collapsedLine}
                    </Text>
                    <Text allowFontScaling numberOfLines={1} style={styles.metaLine}>
                      {collapsedMetaLine}
                    </Text>
                    <StoresMapQuickFilterRow
                      filterState={filterState}
                      onMorePress={handleMoreFilters}
                      onToggleSmartFilter={handleQuickSmartToggle}
                    />
                  </>
                ) : null}
              </>
            )}
          </View>
        </GestureDetector>

        {restingSnap === 'medium' ? (
          <View style={styles.mediumBody}>
            <StoresMapSheetControls
              filterState={filterState}
              groupChips={groupChips}
              onChipPress={onFilterChipPress}
              onClearAllFilters={onClearAllFilters}
              onClearSearch={onClearSearch}
              onScopeChange={onScopeChange}
              scope={scope}
              searchQuery={searchQuery}
              setSearchQuery={onSearchQueryChange}
              showScopeControls={false}
              showSearch={false}
              smartChips={smartChips}
              workdayChips={workdayChips}
            />
            {listBlock}
          </View>
        ) : null}

        {restingSnap === 'expanded' ? (
          <View style={styles.expandedBody}>
            <View style={styles.stickyControls}>
              <StoresMapSheetControls
                filterState={filterState}
                groupChips={groupChips}
                onChipPress={onFilterChipPress}
                onClearAllFilters={onClearAllFilters}
                onClearSearch={onClearSearch}
                onScopeChange={onScopeChange}
                scope={scope}
                searchQuery={searchQuery}
                setSearchQuery={onSearchQueryChange}
                showScopeControls
                showSearch
                smartChips={smartChips}
                workdayChips={workdayChips}
              />
            </View>
            {listBlock}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  sheet: {
    backgroundColor: AppColors.card,
    borderTopColor: AppColors.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  dragRegion: {
    flexGrow: 0,
    flexShrink: 0,
    gap: STORES_MAP_SHEET_COLLAPSED_TEXT_GAP,
    paddingBottom: STORES_MAP_SHEET_COLLAPSED_DRAG_PADDING_BOTTOM,
    paddingHorizontal: STORES_MAP_SHEET_COLLAPSED_HORIZONTAL_PADDING,
    paddingTop: STORES_MAP_SHEET_COLLAPSED_DRAG_PADDING_TOP,
  },
  dragRegionHidden: {
    height: 0,
    overflow: 'hidden',
  },
  handleTrack: {
    alignItems: 'center',
    height: STORES_MAP_SHEET_COLLAPSED_HANDLE_HEIGHT,
    justifyContent: 'center',
  },
  handle: {
    backgroundColor: AppColors.border,
    borderRadius: 2,
    height: 3,
    width: 32,
  },
  summaryLine: {
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: STORES_MAP_SHEET_COLLAPSED_SUMMARY_LINE_HEIGHT,
  },
  metaLine: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: STORES_MAP_SHEET_COLLAPSED_META_LINE_HEIGHT,
  },
  mediumBody: {
    flex: 1,
    gap: 8,
    minHeight: 0,
    paddingHorizontal: 16,
  },
  expandedBody: {
    flex: 1,
    minHeight: 0,
  },
  stickyControls: {
    borderBottomColor: AppColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  listRegion: {
    flex: 1,
    minHeight: 0,
  },
});
