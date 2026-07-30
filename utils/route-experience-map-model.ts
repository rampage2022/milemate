import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import type { RouteCompleteRecord } from '@/types/route-complete-record';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildBriefingRouteMapModel,
  routeLocationsShareCoordinates,
  type BriefingMapMarker,
  type BriefingRouteMapModel,
} from '@/utils/briefing-route-map-model';
import type { RouteLocation } from '@/types/route-location';

export type RouteExperienceMapMode = 'planning' | 'active' | 'complete';

export type RouteMapStopPhase =
  | 'completed'
  | 'current'
  | 'next'
  | 'pending'
  | 'skipped';

export type RouteMapMarker = BriefingMapMarker & {
  routePhase?: RouteMapStopPhase;
};

export type RouteExperienceMapModel = {
  markers: RouteMapMarker[];
  polyline: BriefingRouteMapModel['polyline'];
};

export type ActiveRouteMapFocus = {
  currentStoreId: string | null;
  nextStoreId: string | null;
};

function resolveStopPhase(input: {
  storeId: string;
  visit: StoreVisit;
  currentStoreId: string | null;
  nextStoreId: string | null;
}): RouteMapStopPhase {
  if (input.visit.status === 'skipped') {
    return 'skipped';
  }

  if (input.visit.status === 'completed') {
    return 'completed';
  }

  if (input.storeId === input.currentStoreId) {
    return 'current';
  }

  if (input.storeId === input.nextStoreId) {
    return 'next';
  }

  return 'pending';
}

export function buildPlanningRouteExperienceModel(input: {
  draft: RoutePlanningDraft;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): RouteExperienceMapModel | null {
  const base = buildBriefingRouteMapModel(input);

  if (!base) {
    return null;
  }

  return {
    ...base,
    markers: base.markers.map((marker) => ({ ...marker })),
  };
}

export function buildActiveRouteExperienceModel(input: {
  draft: RoutePlanningDraft;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
  focus: ActiveRouteMapFocus;
}): RouteExperienceMapModel | null {
  const base = buildBriefingRouteMapModel({
    draft: input.draft,
    visits: input.visits,
    storesById: input.storesById,
  });

  if (!base) {
    return null;
  }

  const visitsByStoreId = new Map(
    input.visits.map((visit) => [visit.storeId, visit] as const),
  );

  const markers = base.markers.flatMap((marker) => {
    if (marker.kind !== 'stop' || !marker.storeId) {
      return [marker];
    }

    const visit = visitsByStoreId.get(marker.storeId);

    if (!visit) {
      return [];
    }

    const routePhase = resolveStopPhase({
      storeId: marker.storeId,
      visit,
      currentStoreId: input.focus.currentStoreId,
      nextStoreId: input.focus.nextStoreId,
    });

    if (routePhase === 'skipped') {
      return [];
    }

    return [{ ...marker, routePhase }];
  });

  return {
    ...base,
    markers,
  };
}

export function buildCompleteRouteExperienceModel(input: {
  draft: RoutePlanningDraft;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): RouteExperienceMapModel | null {
  const base = buildBriefingRouteMapModel({
    draft: input.draft,
    visits: input.visits,
    storesById: input.storesById,
  });

  if (!base) {
    return null;
  }

  const visitsByStoreId = new Map(
    input.visits.map((visit) => [visit.storeId, visit] as const),
  );

  const markers = base.markers.flatMap((marker) => {
    if (marker.kind !== 'stop' || !marker.storeId) {
      return [marker];
    }

    const visit = visitsByStoreId.get(marker.storeId);

    if (!visit) {
      return [];
    }

    const routePhase: RouteMapStopPhase =
      visit.status === 'skipped'
        ? 'skipped'
        : visit.status === 'completed'
          ? 'completed'
          : 'pending';

    return [{ ...marker, routePhase }];
  });

  return {
    ...base,
    markers,
  };
}

/** Map model for the finish screen from persisted route-complete record (no planning draft). */
export function buildRouteCompleteMapModelFromRecord(
  record: RouteCompleteRecord,
): RouteExperienceMapModel | null {
  const { endEndpoint, startEndpoint, storesById, visits } = record;

  if (!startEndpoint || !endEndpoint) {
    return null;
  }

  const sorted = [...visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );

  const polyline: Array<{ latitude: number; longitude: number }> = [
    { latitude: startEndpoint.latitude, longitude: startEndpoint.longitude },
  ];
  const markers: RouteMapMarker[] = [
    {
      kind: 'start',
      latitude: startEndpoint.latitude,
      longitude: startEndpoint.longitude,
      title: startEndpoint.label,
    },
  ];

  sorted.forEach((visit, index) => {
    const store = storesById[visit.storeId];

    if (
      !store ||
      typeof store.latitude !== 'number' ||
      typeof store.longitude !== 'number' ||
      !Number.isFinite(store.latitude) ||
      !Number.isFinite(store.longitude)
    ) {
      return;
    }

    const display = formatPlanningStopDisplay(store);
    const routePhase: RouteMapStopPhase =
      visit.status === 'skipped'
        ? 'skipped'
        : visit.status === 'completed'
          ? 'completed'
          : 'pending';

    polyline.push({ latitude: store.latitude, longitude: store.longitude });
    markers.push({
      kind: 'stop',
      latitude: store.latitude,
      longitude: store.longitude,
      routePhase,
      stopNumber: index + 1,
      storeId: store.id,
      storeNumber: store.storeNumber,
      subtitle: display.subtitle,
      title: display.title,
    });
  });

  polyline.push({
    latitude: endEndpoint.latitude,
    longitude: endEndpoint.longitude,
  });
  const startAsLocation: RouteLocation = {
    id: 'route-complete-start',
    formattedAddress: startEndpoint.label,
    latitude: startEndpoint.latitude,
    longitude: startEndpoint.longitude,
    source: 'manual',
  };
  const endAsLocation: RouteLocation = {
    id: 'route-complete-end',
    formattedAddress: endEndpoint.label,
    latitude: endEndpoint.latitude,
    longitude: endEndpoint.longitude,
    source: 'manual',
  };
  if (!routeLocationsShareCoordinates(startAsLocation, endAsLocation)) {
    markers.push({
      kind: 'finish',
      latitude: endEndpoint.latitude,
      longitude: endEndpoint.longitude,
      title: endEndpoint.label,
    });
  }

  return { markers, polyline };
}

export function collectActiveSegmentCoordinates(input: {
  model: RouteExperienceMapModel;
  focus: ActiveRouteMapFocus;
}): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];

  for (const marker of input.model.markers) {
    if (marker.kind === 'start') {
      points.push({ latitude: marker.latitude, longitude: marker.longitude });
      continue;
    }

    if (marker.kind === 'finish') {
      continue;
    }

    if (marker.kind === 'stop' && marker.storeId) {
      if (
        marker.routePhase === 'current' ||
        marker.routePhase === 'next' ||
        marker.routePhase === 'completed'
      ) {
        points.push({ latitude: marker.latitude, longitude: marker.longitude });
      }
    }
  }

  if (points.length < 2) {
    return input.model.polyline.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));
  }

  const end = getEffectiveEndLocationFromModel(input.model);

  if (end) {
    points.push(end);
  }

  return points;
}

function getEffectiveEndLocationFromModel(
  model: RouteExperienceMapModel,
): { latitude: number; longitude: number } | null {
  const finish = model.markers.find((marker) => marker.kind === 'finish');

  if (finish) {
    return { latitude: finish.latitude, longitude: finish.longitude };
  }

  const start = model.markers.find((marker) => marker.kind === 'start');

  if (!start) {
    return null;
  }

  return { latitude: start.latitude, longitude: start.longitude };
}
