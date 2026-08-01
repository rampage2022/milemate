import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppColors } from '@/components/shared/app-theme';
import { StoresLayout } from '@/components/stores/stores-layout';
import { StoresMapMarkerGlyph } from '@/components/stores/stores-map-marker-glyph';
import { StoresMapPreviewCard } from '@/components/stores/stores-map-preview-card';
import { StoresMapWorkdayFilters } from '@/components/stores/stores-map-workday-filters';
import type { StoreListItem } from '@/hooks/use-stores-screen-data';
import type { WorkdayTemplate } from '@/types/workday-template';
import type { StoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import {
  buildStoresMapModel,
  ROUTE_MAP_FIT_EDGE_PADDING,
  type StoresMapWorkdayFilter,
} from '@/utils/stores-map-model';

export type StoresMapViewProps = {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  items: StoreListItem[];
  onOpenStore: (storeId: string) => void;
  onWorkdayFilterChange: (filterId: StoresMapWorkdayFilter) => void;
  templates: WorkdayTemplate[];
  workdayFilter: StoresMapWorkdayFilter;
};

export function StoresMapView({
  assignmentIndex,
  items,
  onOpenStore,
  onWorkdayFilterChange,
  templates,
  workdayFilter,
}: StoresMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const userExploringRef = useRef(false);
  const isProgrammaticCameraRef = useRef(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const mapModel = useMemo(
    () =>
      buildStoresMapModel({
        assignmentIndex,
        items,
        templates,
        workdayFilter,
      }),
    [assignmentIndex, items, templates, workdayFilter],
  );

  useEffect(() => {
    setSelectedStoreId((current) => {
      if (!current) {
        return null;
      }

      return mapModel.markers.some((marker) => marker.storeId === current)
        ? current
        : null;
    });
  }, [mapModel.fitRegionKey, mapModel.markers]);

  const fitMapToMarkers = useCallback(
    (animated: boolean) => {
      if (mapModel.fitCoordinates.length === 0) {
        return;
      }

      isProgrammaticCameraRef.current = true;

      if (mapModel.fitCoordinates.length === 1) {
        mapRef.current?.animateToRegion(mapModel.fitRegion, animated ? 280 : 0);
        return;
      }

      mapRef.current?.fitToCoordinates(mapModel.fitCoordinates, {
        animated,
        edgePadding: ROUTE_MAP_FIT_EDGE_PADDING,
      });
    },
    [mapModel.fitCoordinates, mapModel.fitRegion],
  );

  useEffect(() => {
    if (userExploringRef.current) {
      return;
    }

    fitMapToMarkers(false);
  }, [fitMapToMarkers, mapModel.fitRegionKey]);

  const handleRecenter = useCallback(() => {
    userExploringRef.current = false;
    setSelectedStoreId(null);
    fitMapToMarkers(true);
  }, [fitMapToMarkers]);

  const handleRegionChange = useCallback((_region: Region, details?: { isGesture?: boolean }) => {
    if (details?.isGesture) {
      userExploringRef.current = true;
    }

    if (isProgrammaticCameraRef.current) {
      isProgrammaticCameraRef.current = false;
    }
  }, []);

  const selectedPreview =
    selectedStoreId !== null ? mapModel.previewByStoreId[selectedStoreId] : undefined;

  const statusLine = `${mapModel.counts.total} store${mapModel.counts.total === 1 ? '' : 's'} · ${mapModel.counts.onMap} on map${
    mapModel.counts.missingLocation > 0
      ? ` · ${mapModel.counts.missingLocation} need location`
      : ''
  }`;

  return (
    <View style={styles.shell}>
      <StoresMapWorkdayFilters
        chips={mapModel.filterChips}
        onChange={onWorkdayFilterChange}
        selectedFilterId={workdayFilter}
      />

      <Text accessibilityLiveRegion="polite" allowFontScaling style={styles.statusLine}>
        {statusLine}
      </Text>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          accessibilityLabel="Stores map"
          initialRegion={mapModel.fitRegion}
          moveOnMarkerPress={false}
          onPanDrag={() => {
            userExploringRef.current = true;
          }}
          onPress={() => {
            setSelectedStoreId(null);
          }}
          onRegionChange={handleRegionChange}
          pitchEnabled={false}
          rotateEnabled={false}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation={false}
          style={styles.map}
        >
          {mapModel.markers.map((marker) => (
            <Marker
              key={marker.storeId}
              accessibilityLabel={marker.accessibilityLabel}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              onPress={(event) => {
                event.stopPropagation();
                setSelectedStoreId(marker.storeId);
              }}
              tracksViewChanges={false}
            >
              <StoresMapMarkerGlyph
                abbreviation={marker.pinAbbreviation}
                backgroundColor={marker.markerBackground}
                foregroundColor={marker.markerForeground}
              />
            </Marker>
          ))}
        </MapView>

        {mapModel.markers.length > 0 ? (
          <Pressable
            accessibilityLabel="Recenter map on all visible stores"
            accessibilityRole="button"
            onPress={handleRecenter}
            style={({ pressed }) => [styles.recenterButton, pressed && styles.pressed]}
          >
            <Ionicons color={AppColors.textPrimary} name="locate-outline" size={18} />
            <Text style={styles.recenterLabel}>Show all</Text>
          </Pressable>
        ) : null}

        {mapModel.emptyKind !== 'none' ? (
          <View pointerEvents="none" style={styles.emptyOverlay}>
            <Text allowFontScaling style={styles.emptyTitle}>
              {mapModel.emptyKind === 'no_stores_in_scope'
                ? 'No stores in this view'
                : 'No mappable stores'}
            </Text>
            <Text allowFontScaling style={styles.emptyMessage}>
              {mapModel.emptyKind === 'no_stores_in_scope'
                ? 'Adjust Today / All Stores, search, or workday filters.'
                : mapModel.counts.total > 0
                  ? 'Stores in this view need saved map coordinates. List view still shows every store—open a store to review its address.'
                  : 'Add or import stores to see them here.'}
            </Text>
          </View>
        ) : null}

        {selectedPreview ? (
          <StoresMapPreviewCard
            onOpenStore={() => {
              onOpenStore(selectedPreview.store.id);
            }}
            preview={selectedPreview}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    gap: 8,
  },
  statusLine: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  mapWrap: {
    borderColor: AppColors.border,
    borderRadius: StoresLayout.listRowRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: 280,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  recenterButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 14, 20, 0.92)',
    borderColor: AppColors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  recenterLabel: {
    color: AppColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(11, 14, 20, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
