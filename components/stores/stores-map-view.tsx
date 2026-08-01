import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';

import { AppColors } from '@/components/shared/app-theme';
import { StoresLayout } from '@/components/stores/stores-layout';
import { storeHasVerifiedCoordinates } from '@/services/store-geocoding';
import type { Store } from '@/types/store';
import type { StoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import {
  computeRouteMapInitialRegion,
  type MapLatLng,
} from '@/utils/route-map-utils';

/** Boundary for Phase 3+ store map (markers, filters, selection). */
export type StoresMapViewProps = {
  onOpenStore: (storeId: string) => void;
  onSelectStore?: (storeId: string | null) => void;
  selectedStoreId?: string | null;
  selectedWorkdayIds?: string[];
  stores: Store[];
  workdayAssignments?: StoreWorkdayAssignmentIndex | null;
};

const DEFAULT_REGION = {
  latitude: 32.7767,
  longitude: -96.797,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

function collectMappableCoordinates(stores: Store[]): MapLatLng[] {
  return stores
    .filter((store) => storeHasVerifiedCoordinates(store))
    .map((store) => ({
      latitude: store.latitude!,
      longitude: store.longitude!,
    }));
}

export function StoresMapView({ stores }: StoresMapViewProps) {
  const mappableCount = useMemo(
    () => stores.filter((store) => storeHasVerifiedCoordinates(store)).length,
    [stores],
  );

  const initialRegion = useMemo(() => {
    const coordinates = collectMappableCoordinates(stores);

    if (coordinates.length === 0) {
      return DEFAULT_REGION;
    }

    if (coordinates.length === 1) {
      const point = coordinates[0]!;

      return {
        latitude: point.latitude,
        longitude: point.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    return computeRouteMapInitialRegion(coordinates, { planningOverview: true });
  }, [stores]);

  const bannerTitle =
    stores.length === 0
      ? 'No stores in this view'
      : mappableCount === 0
        ? 'Map preview unavailable'
        : 'Store map preview';

  const bannerMessage =
    stores.length === 0
      ? 'Switch to All Stores or adjust Today’s route to see locations here.'
      : mappableCount === 0
        ? 'Stores in this view are missing map coordinates. Your library is intact—list view still shows every store.'
        : 'Color-coded workday markers and filters are coming next. This map shows your current store area without route overlays.';

  return (
    <View style={styles.shell}>
      <MapView
        accessibilityLabel="Stores map preview"
        initialRegion={initialRegion}
        pitchEnabled={false}
        rotateEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
        style={styles.map}
      />
      <View pointerEvents="none" style={styles.banner}>
        <Text allowFontScaling style={styles.bannerTitle}>
          {bannerTitle}
        </Text>
        <Text allowFontScaling style={styles.bannerMessage}>
          {bannerMessage}
        </Text>
        {stores.length > 0 && mappableCount > 0 ? (
          <Text allowFontScaling style={styles.bannerMeta}>
            {mappableCount} of {stores.length} stores can be placed on the map
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
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
  banner: {
    backgroundColor: 'rgba(11, 14, 20, 0.88)',
    borderColor: AppColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    gap: 4,
    left: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    right: 0,
  },
  bannerTitle: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  bannerMessage: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bannerMeta: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
