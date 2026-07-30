import { useEffect, useMemo, useState } from 'react';

import { getEffectiveEndLocation } from '@/services/route-planning';
import type { RoutePlanningDraft, RouteMapCoordinate } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { resolveDrivingRoutePolyline } from '@/utils/resolve-driving-route-polyline';
import { storeToOptimizableStop } from '@/utils/route-optimization';

function buildPolylineRequestKey(input: {
  draft: RoutePlanningDraft;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): string | null {
  const start = input.draft.startLocation;
  const end = getEffectiveEndLocation(input.draft);

  if (!start || !end) {
    return null;
  }

  const sorted = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );

  const stopPart = sorted
    .map((visit) => {
      const store = input.storesById[visit.storeId];
      const stop = store ? storeToOptimizableStop(visit.id, store) : null;

      if (!stop) {
        return 'missing';
      }

      return `${stop.latitude},${stop.longitude}`;
    })
    .join('|');

  return [
    start.latitude,
    start.longitude,
    end.latitude,
    end.longitude,
    stopPart,
  ].join(';');
}

/** iOS MapKit road geometry for the planning map (not persisted until Set Route). */
export function usePlanningDrivingPolyline(input: {
  draft: RoutePlanningDraft;
  enabled: boolean;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
}): RouteMapCoordinate[] | null {
  const [polyline, setPolyline] = useState<RouteMapCoordinate[] | null>(null);
  const requestKey = useMemo(
    () =>
      buildPolylineRequestKey({
        draft: input.draft,
        visits: input.visits,
        storesById: input.storesById,
      }),
    [input.draft, input.storesById, input.visits],
  );

  useEffect(() => {
    if (!input.enabled || !requestKey) {
      setPolyline(null);
      return;
    }

    const start = input.draft.startLocation;
    const end = getEffectiveEndLocation(input.draft);

    if (!start || !end) {
      setPolyline(null);
      return;
    }

    const sorted = [...input.visits].sort(
      (left, right) => left.routeOrder - right.routeOrder,
    );
    const orderedStops = sorted
      .map((visit) => {
        const store = input.storesById[visit.storeId];

        if (!store) {
          return null;
        }

        return storeToOptimizableStop(visit.id, store);
      })
      .filter((stop): stop is NonNullable<typeof stop> => stop !== null);

    if (orderedStops.length !== sorted.length) {
      setPolyline(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const next = await resolveDrivingRoutePolyline({
        start,
        end,
        orderedStops,
      });

      if (!cancelled) {
        setPolyline(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input.draft, input.enabled, requestKey, input.storesById, input.visits]);

  if (input.draft.drivingPolyline && input.draft.drivingPolyline.length >= 2) {
    return input.draft.drivingPolyline;
  }

  return polyline;
}
