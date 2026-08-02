import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import { StoresMapBottomSheet } from '@/components/stores/stores-map-bottom-sheet';
import { StoresMapFloatingHeader } from '@/components/stores/stores-map-floating-header';
import { StoresMapFloatingStoreCard } from '@/components/stores/stores-map-floating-store-card';
import { StoresMapStoreGroupPickerModal } from '@/components/stores/stores-map-store-group-picker-modal';
import { StoresMapOverlayControls } from '@/components/stores/stores-map-overlay-controls';
import { StoresMapMarkerGlyph } from '@/components/stores/stores-map-marker-glyph';
import type { StoresMapSheetSnap } from '@/components/stores/stores-map-sheet-snap';
import { useStoresMapSheetSnapGeometry } from '@/components/stores/use-stores-map-sheet-snap-geometry';
import type { StoresScope } from '@/components/stores/stores-screen';
import type { StoreListItem } from '@/hooks/use-stores-screen-data';
import type { Store } from '@/types/store';
import type { WorkdayTemplate } from '@/types/workday-template';
import type { StoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import type { StoreGroup } from '@/types/store-group';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import {
  applyStoresMapFilterChipPress,
  clearAllStoresMapFilters,
  formatStoresMapSheetCollapsedPrimaryLine,
  type StoresMapFilterState,
} from '@/utils/stores-map-filter-state';
import type { StoresMapSmartFilterIndex } from '@/utils/stores-map-smart-filter-index';
import {
  buildStoresMapGroupFilterChips,
  buildStoresMapModel,
  buildStoresMapSmartFilterChips,
  ROUTE_MAP_FIT_EDGE_PADDING,
} from '@/utils/stores-map-model';
import {
  buildStoresMapSelectedStoreCardModel,
} from '@/utils/stores-map-selected-store-card-model';
import { buildLatestNotReceivedChecksByOrderId } from '@/utils/stores-map-smart-filter-index';
import {
  getForegroundPermission,
  getOneTimeLocationFix,
  requestForegroundPermission,
} from '@/services/location';
import { addExistingStoreToTodayRoute } from '@/services/route-calculation';
import type { StoresMapInitialSelectionRequest } from '@/utils/stores-map-navigation-intent';
import { shouldFitStoresMapToVisibleMarkers } from '@/utils/stores-map-navigation-intent';
import {
  computeStoresMapOverlayControlsTop,
  shouldHideStoresMapOverlayControlsForExpandedSheet,
  shouldShowStoresMapOverlayControls,
} from '@/utils/stores-map-map-controls-layout';
import {
  computeStoresMapFloatingStoreCardBottom,
  computeStoresMapSheetCollapsedHeight,
  computeStoresMapSheetSelectedStorePeekHeight,
  computeStoresMapFloatingHeaderReserve,
  computeStoresMapSheetHostHeight,
  STORES_MAP_FLOATING_STORE_CARD_MIN_HEIGHT,
  shouldShowStoresMapFloatingHeader,
} from '@/utils/stores-map-sheet-layout';
import { openStoreDirectionsSafely } from '@/utils/store-navigation';

export type StoresMapViewProps = {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  deleteEnabled: boolean;
  deliveryChecks: StoreOrderDeliveryCheck[];
  items: StoreListItem[];
  listEmptyComponent: ReactElement | null;
  membershipLabelForStore: (storeId: string) => string | null;
  onDeleteStore: (store: Store) => void;
  onOpenStore: (storeId: string) => void;
  onScopeChange: (scope: StoresScope) => void;
  onSearchQueryChange: (value: string) => void;
  onClearSearch: () => void;
  scope: StoresScope;
  searchQuery: string;
  smartFilterIndex: StoresMapSmartFilterIndex;
  storeGroups: StoreGroup[];
  templates: WorkdayTemplate[];
  filterState: StoresMapFilterState;
  onFilterStateChange: (state: StoresMapFilterState) => void;
  orders: StoreOrder[];
  resolvedVisits: StoreVisit[];
  onRefreshData: () => void;
  initialSelectionRequest?: StoresMapInitialSelectionRequest | null;
  onBackToWorkdayPreview?: () => void;
  showPreviewBack?: boolean;
};

export function StoresMapView({
  assignmentIndex,
  deleteEnabled,
  deliveryChecks,
  items,
  listEmptyComponent,
  membershipLabelForStore,
  onDeleteStore,
  onOpenStore,
  onScopeChange,
  onSearchQueryChange,
  onClearSearch,
  scope,
  searchQuery,
  smartFilterIndex,
  storeGroups,
  templates,
  filterState,
  onFilterStateChange,
  orders,
  resolvedVisits,
  onRefreshData,
  initialSelectionRequest = null,
  onBackToWorkdayPreview,
  showPreviewBack = false,
}: StoresMapViewProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const userExploringRef = useRef(false);
  const isProgrammaticCameraRef = useRef(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [sheetRestingSnap, setSheetRestingSnap] = useState<StoresMapSheetSnap>('collapsed');
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const appliedInitialSelectionTokenRef = useRef<string | null>(null);

  const templatesById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );

  const mapModel = useMemo(
    () =>
      buildStoresMapModel({
        assignmentIndex,
        filterState,
        groups: storeGroups,
        items,
        smartFilterIndex,
        templates,
      }),
    [assignmentIndex, filterState, items, smartFilterIndex, storeGroups, templates],
  );

  const workdayChips = mapModel.filterChips;
  const groupChips = useMemo(
    () => buildStoresMapGroupFilterChips(storeGroups),
    [storeGroups],
  );
  const smartChips = useMemo(() => buildStoresMapSmartFilterChips(), []);

  const markers = mapModel.markers;
  const fitRegionKey = mapModel.fitRegionKey;

  const sheetPeekWhileSelected = computeStoresMapSheetSelectedStorePeekHeight();

  const sheetGeometry = useStoresMapSheetSnapGeometry({
    bottomInset: insets.bottom,
    collapsedHeightOverride: selectedStoreId
      ? sheetPeekWhileSelected
      : computeStoresMapSheetCollapsedHeight(insets.bottom),
    tabBarHeight: AppSpacing.tabBarContentHeight,
    topInset: insets.top,
  });

  const checksByOrderId = useMemo(
    () => buildLatestNotReceivedChecksByOrderId(deliveryChecks),
    [deliveryChecks],
  );

  const selectedPreview =
    selectedStoreId !== null ? mapModel.previewByStoreId[selectedStoreId] : undefined;

  const selectedStoreCardModel = useMemo(() => {
    if (!selectedPreview || !selectedStoreId) {
      return null;
    }

    const activeGroupNames = storeGroups
      .filter((group) => group.storeIds.includes(selectedStoreId))
      .map((group) => group.name.trim())
      .filter((name) => name.length > 0);

    const listItem = items.find((item) => item.store.id === selectedStoreId);

    return buildStoresMapSelectedStoreCardModel({
      activeGroupNames,
      checksByOrderId,
      isOnTodayRoute: listItem?.visit != null,
      orders,
      preview: selectedPreview,
      resolvedVisits,
      smartFilterIndex,
    });
  }, [
    checksByOrderId,
    items,
    orders,
    resolvedVisits,
    selectedPreview,
    selectedStoreId,
    smartFilterIndex,
    storeGroups,
  ]);

  const floatingCardBottom = computeStoresMapFloatingStoreCardBottom();

  const handleClearSelection = useCallback(() => {
    setSelectedStoreId(null);
  }, []);

  useEffect(() => {
    setSelectedStoreId((current) => {
      if (!current) {
        return null;
      }

      if (!mapModel.previewByStoreId[current]) {
        return null;
      }

      return markers.some((marker) => marker.storeId === current) ? current : null;
    });
  }, [fitRegionKey, mapModel.previewByStoreId, markers]);

  const fitMapToMarkers = useCallback(
    (animated: boolean) => {
      if (!shouldFitStoresMapToVisibleMarkers(mapModel.fitCoordinates.length)) {
        return;
      }

      isProgrammaticCameraRef.current = true;

      if (mapModel.fitCoordinates.length === 1) {
        mapRef.current?.animateToRegion(mapModel.fitRegion, animated ? 280 : 0);
        return;
      }

      mapRef.current?.fitToCoordinates(mapModel.fitCoordinates, {
        animated,
        edgePadding: {
          ...ROUTE_MAP_FIT_EDGE_PADDING,
          top:
            ROUTE_MAP_FIT_EDGE_PADDING.top +
            insets.top +
            computeStoresMapFloatingHeaderReserve() +
            8,
          bottom:
            ROUTE_MAP_FIT_EDGE_PADDING.bottom +
            (selectedStoreCardModel
              ? STORES_MAP_FLOATING_STORE_CARD_MIN_HEIGHT + floatingCardBottom
              : sheetGeometry.collapsedHeight + 12),
        },
      });
    },
    [floatingCardBottom, insets.top, mapModel.fitCoordinates, mapModel.fitRegion, selectedStoreCardModel, sheetGeometry.collapsedHeight],
  );

  useEffect(() => {
    if (userExploringRef.current) {
      return;
    }

    fitMapToMarkers(false);
  }, [fitMapToMarkers, fitRegionKey]);

  const handleShowAllVisibleStores = useCallback(() => {
    userExploringRef.current = false;
    fitMapToMarkers(true);
  }, [fitMapToMarkers]);

  const handleMyLocation = useCallback(() => {
    void (async () => {
      let permission = await getForegroundPermission();

      if (!permission.granted) {
        permission = await requestForegroundPermission();
      }

      if (!permission.granted) {
        Alert.alert(
          'Location unavailable',
          'Allow location access in Settings to center the map on your position.',
        );

        return;
      }

      const fix = await getOneTimeLocationFix();

      if (!fix.ok) {
        Alert.alert(
          'Location unavailable',
          fix.reason === 'permission_denied'
            ? 'Allow location access in Settings to center the map on your position.'
            : 'Could not determine your current location. Try again in a moment.',
        );

        return;
      }

      setShowsUserLocation(true);
      isProgrammaticCameraRef.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: fix.update.latitude,
          longitude: fix.update.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        280,
      );
    })();
  }, []);

  const handleRegionChange = useCallback((_region: Region, details?: { isGesture?: boolean }) => {
    if (details?.isGesture) {
      userExploringRef.current = true;
    }

    if (isProgrammaticCameraRef.current) {
      isProgrammaticCameraRef.current = false;
    }
  }, []);

  const handleSelectStore = useCallback(
    (storeId: string) => {
      const marker = markers.find((entry) => entry.storeId === storeId);
      setSelectedStoreId(storeId);

      if (marker) {
        isProgrammaticCameraRef.current = true;
        mapRef.current?.animateToRegion(
          {
            latitude: marker.latitude,
            longitude: marker.longitude,
            latitudeDelta: 0.09,
            longitudeDelta: 0.09,
          },
          220,
        );
      }
    },
    [markers],
  );

  useEffect(() => {
    if (!initialSelectionRequest) {
      return;
    }

    if (appliedInitialSelectionTokenRef.current === initialSelectionRequest.token) {
      return;
    }

    if (!markers.some((marker) => marker.storeId === initialSelectionRequest.storeId)) {
      return;
    }

    appliedInitialSelectionTokenRef.current = initialSelectionRequest.token;
    userExploringRef.current = false;
    handleSelectStore(initialSelectionRequest.storeId);
  }, [handleSelectStore, initialSelectionRequest, markers]);


  const handleNavigateToSelectedStore = useCallback(() => {
    if (!selectedPreview) {
      return;
    }

    openStoreDirectionsSafely(selectedPreview.store);
  }, [selectedPreview]);

  const handleAddSelectedStoreToRoute = useCallback(() => {
    if (!selectedStoreId || selectedStoreCardModel?.isOnTodayRoute) {
      return;
    }

    void (async () => {
      try {
        await addExistingStoreToTodayRoute(selectedStoreId);
        onRefreshData();
        Alert.alert('Added to route', 'This store was added to Build Your Route for today.');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not add this store to the route.';

        Alert.alert('Could not add stop', message);
      }
    })();
  }, [onRefreshData, selectedStoreCardModel?.isOnTodayRoute, selectedStoreId]);

  const handleFilterChipPress = useCallback(
    (filterId: string) => {
      onFilterStateChange(
        applyStoresMapFilterChipPress({
          chipFilterId: filterId,
          state: filterState,
        }),
      );
    },
    [filterState, onFilterStateChange],
  );

  const scopeLabel = scope === 'today' ? 'Today' : 'All Stores';

  const collapsedPrimaryLine = formatStoresMapSheetCollapsedPrimaryLine({
    groupsById: new Map(storeGroups.map((group) => [group.id, group])),
    scopeLabel,
    state: filterState,
    templatesById,
    visibleStoreCount: mapModel.counts.total,
  });

  const handleSheetRestingSnapChange = useCallback((snap: StoresMapSheetSnap) => {
    setSheetRestingSnap(snap);
  }, []);

  const filteredListItems = useMemo(
    () => items.filter((item) => mapModel.previewByStoreId[item.store.id] !== undefined),
    [items, mapModel.previewByStoreId],
  );

  const hostHeight = computeStoresMapSheetHostHeight({
    tabBarHeight: AppSpacing.tabBarContentHeight,
    topInset: insets.top,
    windowHeight,
  });

  const showFloatingHeader = shouldShowStoresMapFloatingHeader({
    hostHeight,
    mediumSheetHeight: sheetGeometry.mediumHeight,
    sheetSnap: sheetRestingSnap,
    topInset: insets.top,
  });
  const overlayControlsVisible =
    shouldShowStoresMapOverlayControls({ sheetSnap: sheetRestingSnap }) &&
    !shouldHideStoresMapOverlayControlsForExpandedSheet({ sheetSnap: sheetRestingSnap });
  const overlayControlsTop = computeStoresMapOverlayControlsTop({
    collapsedSheetHeight: sheetGeometry.collapsedHeight,
    estimatedSelectedCardHeight: selectedStoreCardModel
      ? STORES_MAP_FLOATING_STORE_CARD_MIN_HEIGHT
      : 0,
    floatingCardBottom,
    hostHeight,
    mediumSheetHeight: sheetGeometry.mediumHeight,
    selectedStoreCardVisible: Boolean(selectedStoreCardModel),
    sheetSnap: sheetRestingSnap,
    topInset: insets.top,
  });

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        accessibilityLabel="Stores map"
        initialRegion={mapModel.fitRegion}
        moveOnMarkerPress={false}
        onPanDrag={() => {
          userExploringRef.current = true;
          Keyboard.dismiss();
        }}
        onPress={() => {
          Keyboard.dismiss();
          handleClearSelection();
        }}
        onRegionChange={handleRegionChange}
        pitchEnabled={false}
        rotateEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={showsUserLocation}
        style={StyleSheet.absoluteFill}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.storeId}
            accessibilityLabel={marker.accessibilityLabel}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            onPress={(event) => {
              event.stopPropagation();
              handleSelectStore(marker.storeId);
            }}
            tracksViewChanges={false}
          >
            <StoresMapMarkerGlyph
              backgroundColor={marker.markerBackground}
              selected={selectedStoreId === marker.storeId}
            />
          </Marker>
        ))}
      </MapView>

      <StoresMapFloatingHeader
        onBackToWorkdayPreview={onBackToWorkdayPreview}
        onClearSearch={onClearSearch}
        onScopeChange={onScopeChange}
        scope={scope}
        searchQuery={searchQuery}
        setSearchQuery={onSearchQueryChange}
        showPreviewBack={showPreviewBack}
        topInset={insets.top}
        visible={showFloatingHeader}
      />

      <StoresMapOverlayControls
        onMyLocation={handleMyLocation}
        onShowAll={handleShowAllVisibleStores}
        top={overlayControlsTop}
        visible={overlayControlsVisible}
      />

      {mapModel.emptyKind !== 'none' ? (
        <View pointerEvents="none" style={[styles.emptyOverlay, { top: insets.top + 140 }]}>
          <Text allowFontScaling style={styles.emptyTitle}>
            {mapModel.emptyKind === 'no_stores_in_scope'
              ? 'No stores in this view'
              : 'No mappable stores'}
          </Text>
          <Text allowFontScaling style={styles.emptyMessage}>
            {mapModel.emptyKind === 'no_stores_in_scope'
              ? 'Adjust Today / All Stores, search, or workday filters.'
              : mapModel.counts.total > 0
                ? 'Stores in this view need saved map coordinates. Open a store from the list to review its address.'
                : 'Add or import stores to see them here.'}
          </Text>
        </View>
      ) : null}

      {selectedStoreCardModel ? (
        <StoresMapFloatingStoreCard
          bottomOffset={floatingCardBottom}
          model={selectedStoreCardModel}
          onAddToRoute={handleAddSelectedStoreToRoute}
          onClose={handleClearSelection}
          onNavigate={handleNavigateToSelectedStore}
          onOpenStoreDetails={() => {
            onOpenStore(selectedStoreCardModel.storeId);
          }}
          onPressGroupBadge={() => {
            setGroupPickerVisible(true);
          }}
        />
      ) : null}

      {selectedStoreId ? (
        <StoresMapStoreGroupPickerModal
          groups={storeGroups}
          onClose={() => {
            setGroupPickerVisible(false);
          }}
          onGroupsChanged={() => {
            onRefreshData();
          }}
          storeId={selectedStoreId}
          visible={groupPickerVisible}
        />
      ) : null}

      <StoresMapBottomSheet
        browseCollapsedChromeHidden={Boolean(selectedStoreId)}
        collapsedPrimaryLine={collapsedPrimaryLine}
        counts={mapModel.counts}
        deleteEnabled={deleteEnabled}
        filterState={filterState}
        geometry={sheetGeometry}
        groupChips={groupChips}
        items={filteredListItems}
        listEmptyComponent={listEmptyComponent}
        membershipLabelForStore={membershipLabelForStore}
        onClearAllFilters={() => {
          onFilterStateChange(clearAllStoresMapFilters());
        }}
        onClearSearch={onClearSearch}
        onDeleteStore={onDeleteStore}
        onFilterChipPress={handleFilterChipPress}
        onFilterStateChange={onFilterStateChange}
        onOpenStore={onOpenStore}
        onRestingSnapChange={handleSheetRestingSnapChange}
        onScopeChange={onScopeChange}
        onSearchQueryChange={onSearchQueryChange}
        onSelectStore={handleSelectStore}
        scope={scope}
        searchQuery={searchQuery}
        selectedStoreId={selectedStoreId}
        smartChips={smartChips}
        workdayChips={workdayChips}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emptyOverlay: {
    alignItems: 'center',
    left: 24,
    position: 'absolute',
    right: 24,
    zIndex: 1,
  },
  emptyTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyMessage: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
