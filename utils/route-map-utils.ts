import type { Region } from 'react-native-maps';

import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import type { Store } from '@/types/store';

export const ROUTE_MAP_FIT_EDGE_PADDING = {
  top: 52,
  right: 52,
  bottom: 72,
  left: 52,
};

export const ROUTE_MAP_ACTIVE_SEGMENT_PADDING = {
  top: 48,
  right: 44,
  bottom: 56,
  left: 44,
};

/** Build Your Route: stay zoomed out enough to show metro context (highways, neighborhoods). */
export const ROUTE_MAP_PLANNING_OVERVIEW_MIN_DELTA = {
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
} as const;

export const ROUTE_MAP_PLANNING_FIT_EDGE_PADDING = {
  top: 56,
  right: 64,
  bottom: 108,
  left: 64,
};

export type MapLatLng = {
  latitude: number;
  longitude: number;
};

export function computeRouteGeometryKey(points: MapLatLng[]): string {
  return points
    .map(
      (point) =>
        `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`,
    )
    .join('|');
}

export function regionFromMapBoundaries(bounds: {
  northEast: MapLatLng;
  southWest: MapLatLng;
}): Region {
  const { northEast, southWest } = bounds;

  return {
    latitude: (northEast.latitude + southWest.latitude) / 2,
    longitude: (northEast.longitude + southWest.longitude) / 2,
    latitudeDelta: Math.max(0.008, (northEast.latitude - southWest.latitude) * 1.02),
    longitudeDelta: Math.max(0.008, (northEast.longitude - southWest.longitude) * 1.02),
  };
}

const VIEWPORT_INSET_RATIO = 0.12;

export function isCoordinateInsideMapBounds(
  coordinate: MapLatLng,
  bounds: { northEast: MapLatLng; southWest: MapLatLng },
): boolean {
  const latSpan = bounds.northEast.latitude - bounds.southWest.latitude;
  const lngSpan = bounds.northEast.longitude - bounds.southWest.longitude;
  const latInset = latSpan * VIEWPORT_INSET_RATIO;
  const lngInset = lngSpan * VIEWPORT_INSET_RATIO;

  return (
    coordinate.latitude <= bounds.northEast.latitude - latInset &&
    coordinate.latitude >= bounds.southWest.latitude + latInset &&
    coordinate.longitude <= bounds.northEast.longitude - lngInset &&
    coordinate.longitude >= bounds.southWest.longitude + lngInset
  );
}

/** Pan the current viewport the minimum amount to include a point; preserve zoom level. */
export function nudgeRegionToIncludeCoordinate(
  region: Region,
  coordinate: MapLatLng,
): Region {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  const minLat = region.latitude - halfLat * (1 - VIEWPORT_INSET_RATIO * 2);
  const maxLat = region.latitude + halfLat * (1 - VIEWPORT_INSET_RATIO * 2);
  const minLng = region.longitude - halfLng * (1 - VIEWPORT_INSET_RATIO * 2);
  const maxLng = region.longitude + halfLng * (1 - VIEWPORT_INSET_RATIO * 2);

  let nextLatitude = region.latitude;
  let nextLongitude = region.longitude;

  if (coordinate.latitude > maxLat) {
    nextLatitude += coordinate.latitude - maxLat;
  } else if (coordinate.latitude < minLat) {
    nextLatitude += coordinate.latitude - minLat;
  }

  if (coordinate.longitude > maxLng) {
    nextLongitude += coordinate.longitude - maxLng;
  } else if (coordinate.longitude < minLng) {
    nextLongitude += coordinate.longitude - minLng;
  }

  return {
    latitude: nextLatitude,
    longitude: nextLongitude,
    latitudeDelta: region.latitudeDelta,
    longitudeDelta: region.longitudeDelta,
  };
}

export type RouteMapInitialRegionOptions = {
  /** Wider default zoom for Build Your Route (start-only / short spans). */
  planningOverview?: boolean;
};

function expandRegionToMinimum(
  region: Region,
  minimum: { latitudeDelta: number; longitudeDelta: number },
): Region {
  return {
    latitude: region.latitude,
    longitude: region.longitude,
    latitudeDelta: Math.max(region.latitudeDelta, minimum.latitudeDelta),
    longitudeDelta: Math.max(region.longitudeDelta, minimum.longitudeDelta),
  };
}

export function computeRouteMapInitialRegion(
  polyline: MapLatLng[],
  options?: RouteMapInitialRegionOptions,
): Region {
  const latitudes = polyline.map((point) => point.latitude);
  const longitudes = polyline.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const spanMultiplier = options?.planningOverview ? 2.1 : 1.45;
  const minDelta = options?.planningOverview ? 0.04 : 0.02;

  const region: Region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * spanMultiplier || minDelta),
    longitudeDelta: Math.max(minDelta, (maxLng - minLng) * spanMultiplier || minDelta),
  };

  if (options?.planningOverview) {
    return expandRegionToMinimum(region, ROUTE_MAP_PLANNING_OVERVIEW_MIN_DELTA);
  }

  return region;
}

export type RouteMapStopRow = {
  routeOrder: number;
  storeId: string;
  subtitle: string;
  title: string;
};

export function buildRouteMapStopRows(input: {
  storesById: Record<string, Store>;
  visits: Array<{ routeOrder: number; storeId: string }>;
}): RouteMapStopRow[] {
  return [...input.visits]
    .sort((left, right) => left.routeOrder - right.routeOrder)
    .flatMap((visit) => {
      const store = input.storesById[visit.storeId];

      if (!store) {
        return [];
      }

      const display = formatPlanningStopDisplay(store);

      return [
        {
          routeOrder: visit.routeOrder,
          storeId: store.id,
          subtitle: display.subtitle,
          title: display.title,
        },
      ];
    });
}
