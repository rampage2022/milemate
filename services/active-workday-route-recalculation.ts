import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { getStoreById } from '@/services/stores';
import {
  getEffectiveEndLocation,
  getRoutePlanningDraft,
  updateRoutePlanningEstimate,
} from '@/services/route-planning';
import { getTodayVisits } from '@/services/store-visits';
import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { resolveActiveWorkdayRouteOriginLocation } from '@/utils/active-workday-route-origin';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';
import { resolveDrivingRoutePolyline } from '@/utils/resolve-driving-route-polyline';
import {
  buildPlannedRouteEstimate,
  storeToOptimizableStop,
  type OptimizableStop,
} from '@/utils/route-optimization';

function sortByRouteOrder(visits: StoreVisit[]): StoreVisit[] {
  return [...visits].sort((left, right) => left.routeOrder - right.routeOrder);
}

async function loadOrderedRemainingStops(
  visits: StoreVisit[],
): Promise<OptimizableStop[]> {
  const sorted = sortByRouteOrder(visits);
  const remaining = sorted.filter(
    (visit) =>
      visit.status === 'pending' ||
      visit.status === 'current' ||
      visit.status === 'checked_in',
  );
  const remap = await getStoreImportIdRemap();
  const stops: OptimizableStop[] = [];

  for (const visit of remaining) {
    const storeId = resolveRemappedStoreId(visit.storeId, remap);
    const store = await getStoreById(storeId);

    if (!store) {
      continue;
    }

    const optimizable = storeToOptimizableStop(visit.id, store);

    if (optimizable) {
      stops.push(optimizable);
    }
  }

  return stops;
}

async function loadStoresByIdForVisits(
  visits: StoreVisit[],
): Promise<Record<string, Store>> {
  const remap = await getStoreImportIdRemap();
  const storesById: Record<string, Store> = {};

  await Promise.all(
    visits.map(async (visit) => {
      const storeId = resolveRemappedStoreId(visit.storeId, remap);
      const store = await getStoreById(storeId);

      if (store) {
        storesById[visit.storeId] = store;
      }
    }),
  );

  return storesById;
}

/** Rebuild remaining-route estimate and polyline after reorder (preserves visit order). */
export async function recalculateActiveWorkdayRouteEstimate(): Promise<void> {
  const draft = await getRoutePlanningDraft();
  const endLocation = getEffectiveEndLocation(draft);
  const startLocation = draft.startLocation;

  if (!startLocation || !endLocation) {
    return;
  }

  const visits = await getTodayVisits();
  const orderedStops = await loadOrderedRemainingStops(visits);

  if (orderedStops.length === 0) {
    return;
  }

  const storesById = await loadStoresByIdForVisits(visits);
  const originLocation: RouteLocation = resolveActiveWorkdayRouteOriginLocation({
    startLocation,
    storesById,
    visits,
  });

  const estimate = buildPlannedRouteEstimate({
    start: originLocation,
    end: endLocation,
    orderedStops,
    startedAt: new Date(),
  });

  const drivingPolyline = await resolveDrivingRoutePolyline({
    start: originLocation,
    end: endLocation,
    orderedStops,
  });

  await updateRoutePlanningEstimate({
    drivingPolyline,
    estimate,
  });
}
