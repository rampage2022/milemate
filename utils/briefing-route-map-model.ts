import { getEffectiveEndLocation } from '@/services/route-planning';
import { formatPlanningRouteLocationDisplay, formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import type { RouteLocation } from '@/types/route-location';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

export type BriefingMapMarkerKind = 'start' | 'stop' | 'finish';

export type BriefingMapMarker = {
  kind: BriefingMapMarkerKind;
  latitude: number;
  longitude: number;
  stopNumber?: number;
  storeId?: string;
  storeNumber?: string;
  subtitle?: string;
  title?: string;
};

export type BriefingRouteMapModel = {
  markers: BriefingMapMarker[];
  polyline: Array<{ latitude: number; longitude: number }>;
};

function isFiniteCoordinate(location: RouteLocation | null | undefined): location is RouteLocation {
  return (
    !!location &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  );
}

/** Start and effective finish share one map pin (return to start or same coordinates). */
export function routeLocationsShareCoordinates(
  left: RouteLocation,
  right: RouteLocation,
): boolean {
  return left.latitude === right.latitude && left.longitude === right.longitude;
}

function isFiniteStoreCoordinate(store: Store | undefined): store is Store & {
  latitude: number;
  longitude: number;
} {
  return (
    !!store &&
    typeof store.latitude === 'number' &&
    typeof store.longitude === 'number' &&
    Number.isFinite(store.latitude) &&
    Number.isFinite(store.longitude)
  );
}

export function buildBriefingRouteMapModel(input: {
  draft: RoutePlanningDraft;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): BriefingRouteMapModel | null {
  const start = input.draft.startLocation;
  const end = getEffectiveEndLocation(input.draft);

  if (!isFiniteCoordinate(start) || !isFiniteCoordinate(end)) {
    return null;
  }

  const sorted = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );

  const polyline: Array<{ latitude: number; longitude: number }> = [
    { latitude: start.latitude, longitude: start.longitude },
  ];
  const markers: BriefingMapMarker[] = [
    {
      kind: 'start',
      latitude: start.latitude,
      longitude: start.longitude,
      title:
        start.name?.trim() ||
        formatPlanningRouteLocationDisplay(start, 'Start').primary,
    },
  ];

  sorted.forEach((visit, index) => {
    const store = input.storesById[visit.storeId];

    if (!isFiniteStoreCoordinate(store)) {
      return;
    }

    const point = { latitude: store.latitude, longitude: store.longitude };
    polyline.push(point);
    const display = formatPlanningStopDisplay(store);
    markers.push({
      kind: 'stop',
      latitude: store.latitude,
      longitude: store.longitude,
      stopNumber: index + 1,
      storeId: store.id,
      storeNumber: store.storeNumber,
      subtitle: display.subtitle,
      title: display.title,
    });
  });

  polyline.push({ latitude: end.latitude, longitude: end.longitude });
  if (!routeLocationsShareCoordinates(start, end)) {
    markers.push({
      kind: 'finish',
      latitude: end.latitude,
      longitude: end.longitude,
    });
  }

  if (polyline.length < 2) {
    return null;
  }

  const drivingPolyline =
    input.draft.drivingPolyline && input.draft.drivingPolyline.length >= 2
      ? input.draft.drivingPolyline
      : null;

  return {
    markers,
    polyline: drivingPolyline ?? polyline,
  };
}
