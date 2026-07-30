import { getActiveTrip } from '@/services/active-trip';
import { getMyLocations } from '@/services/my-locations';
import {
  getEffectiveEndLocation,
  getRoutePlanningDraft,
} from '@/services/route-planning';
import {
  getRouteCompletedRecordForToday,
  getRouteStartedAtForToday,
} from '@/services/route-session-timing';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { getAllStoreOrders } from '@/services/store-orders';
import { getStoreById } from '@/services/stores';
import { getTodayVisits } from '@/services/store-visits';
import { getTodayRouteSelection } from '@/services/today-route-selection';
import type { ActiveWorkdayRouteEndpointSnapshot } from '@/types/active-workday-route';
import type { RouteLocation } from '@/types/route-location';
import type {
  RouteCompleteMapEndpoint,
  RouteCompleteRecord,
} from '@/types/route-complete-record';
import type { Store } from '@/types/store';
import type { StoreOrder } from '@/types/store-order';
import type { StoreVisit } from '@/types/store-visit';
import { buildActiveWorkdayRouteContext } from '@/utils/active-workday-route';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';

function snapshotToEndpoint(
  snapshot: ActiveWorkdayRouteEndpointSnapshot | null | undefined,
): RouteCompleteMapEndpoint | null {
  if (
    !snapshot ||
    typeof snapshot.latitude !== 'number' ||
    typeof snapshot.longitude !== 'number' ||
    !Number.isFinite(snapshot.latitude) ||
    !Number.isFinite(snapshot.longitude)
  ) {
    return null;
  }

  return {
    label: snapshot.label.trim() || 'Route endpoint',
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
  };
}

function locationToEndpoint(
  location: RouteLocation | null | undefined,
): RouteCompleteMapEndpoint | null {
  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    return null;
  }

  const label =
    location.name?.trim() ||
    location.formattedAddress.split('\n')[0]?.trim() ||
    'Route endpoint';

  return {
    label,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

function resolveDistanceMiles(input: {
  completedRecordDistance?: number;
  activeTripDistance?: number;
}): number | null {
  if (
    typeof input.completedRecordDistance === 'number' &&
    Number.isFinite(input.completedRecordDistance) &&
    input.completedRecordDistance >= 0
  ) {
    return input.completedRecordDistance;
  }

  if (
    typeof input.activeTripDistance === 'number' &&
    Number.isFinite(input.activeTripDistance) &&
    input.activeTripDistance >= 0
  ) {
    return input.activeTripDistance;
  }

  return null;
}

function countOrdersLoggedDuringWorkday(input: {
  orders: StoreOrder[];
  routeStoreIds: Set<string>;
  windowStartMs: number | null;
  windowEndMs: number;
}): number {
  return input.orders.filter((order) => {
    if (!input.routeStoreIds.has(order.storeId)) {
      return false;
    }

    if (input.windowStartMs === null) {
      return true;
    }

    const createdMs = Date.parse(order.createdAt);

    if (!Number.isFinite(createdMs)) {
      return false;
    }

    return createdMs >= input.windowStartMs && createdMs <= input.windowEndMs;
  }).length;
}

async function loadStoresForVisits(visits: StoreVisit[]): Promise<Record<string, Store>> {
  const remap = await getStoreImportIdRemap();
  const storesById: Record<string, Store> = {};

  for (const visit of visits) {
    const storeId = resolveRemappedStoreId(visit.storeId, remap);
    const store = await getStoreById(storeId);

    if (store) {
      storesById[visit.storeId] = store;
    }
  }

  return storesById;
}

async function resolveRouteEndpoints(input: {
  activeRouteContext: RouteCompleteRecord['routeContext'];
  planningDraft: Awaited<ReturnType<typeof getRoutePlanningDraft>>;
}): Promise<{
  endEndpoint: RouteCompleteMapEndpoint | null;
  returnToStart: boolean;
  startEndpoint: RouteCompleteMapEndpoint | null;
}> {
  const fromTrip = {
    startEndpoint: snapshotToEndpoint(input.activeRouteContext?.startEndpointSnapshot),
    endEndpoint: snapshotToEndpoint(input.activeRouteContext?.endEndpointSnapshot),
    returnToStart: input.activeRouteContext?.returnToStart ?? false,
  };

  if (fromTrip.startEndpoint && fromTrip.endEndpoint) {
    return fromTrip;
  }

  const [selection, locations] = await Promise.all([
    getTodayRouteSelection(),
    getMyLocations(),
  ]);
  const selectionContext = buildActiveWorkdayRouteContext(selection, locations);

  const fromSelection = {
    startEndpoint: snapshotToEndpoint(selectionContext.startEndpointSnapshot),
    endEndpoint: snapshotToEndpoint(selectionContext.endEndpointSnapshot),
    returnToStart: selectionContext.returnToStart,
  };

  if (fromSelection.startEndpoint && fromSelection.endEndpoint) {
    return fromSelection;
  }

  const endLocation = getEffectiveEndLocation(input.planningDraft);

  return {
    startEndpoint:
      fromTrip.startEndpoint ??
      fromSelection.startEndpoint ??
      locationToEndpoint(input.planningDraft.startLocation),
    endEndpoint:
      fromTrip.endEndpoint ??
      fromSelection.endEndpoint ??
      locationToEndpoint(endLocation),
    returnToStart:
      fromTrip.returnToStart ||
      fromSelection.returnToStart ||
      input.planningDraft.returnToStart,
  };
}

/**
 * Assembles the route-complete read model from persisted storage only.
 *
 * Sources:
 * - Completed stops / visit timestamps: `@milemate/store-visits` (today's visits)
 * - Route completed at (+ optional miles snapshot): `@milemate/route-completed-at`
 * - Route started at: `@milemate/route-started-at`
 * - Workday miles / route endpoints: `@milemate/active-trip` (+ optional routeContext)
 * - Orders logged: `@milemate/store-orders` filtered to route stores and workday window
 * - Map stop coordinates: `@milemate/stores` via visit storeId
 * - Endpoint fallback (if trip/selection unresolved): `@milemate/route-planning-draft`
 */
export async function loadRouteCompleteRecord(): Promise<RouteCompleteRecord | null> {
  const [
    visits,
    completedRecord,
    routeStartedAtMs,
    activeWorkdayTrip,
    orders,
    planningDraft,
  ] = await Promise.all([
    getTodayVisits(),
    getRouteCompletedRecordForToday(),
    getRouteStartedAtForToday(),
    getActiveTrip(),
    getAllStoreOrders(),
    getRoutePlanningDraft(),
  ]);

  if (!completedRecord) {
    return null;
  }

  const storesById = await loadStoresForVisits(visits);
  const routeStoreIds = new Set(visits.map((visit) => visit.storeId));
  const routeContext = activeWorkdayTrip?.routeContext ?? null;
  const endpoints = await resolveRouteEndpoints({
    activeRouteContext: routeContext,
    planningDraft,
  });

  const workdayStartedAtMs =
    activeWorkdayTrip && activeWorkdayTrip.endedAt === undefined
      ? activeWorkdayTrip.startedAt
      : null;

  const windowStartMs = workdayStartedAtMs ?? routeStartedAtMs;
  const ordersLoggedCount = countOrdersLoggedDuringWorkday({
    orders,
    routeStoreIds,
    windowStartMs,
    windowEndMs: completedRecord.timestampMs,
  });

  const distanceMiles = resolveDistanceMiles({
    completedRecordDistance: completedRecord.distanceMilesAtCompletion,
    activeTripDistance: activeWorkdayTrip?.distanceMiles,
  });

  const mileageTrackingAvailable =
    activeWorkdayTrip !== null &&
    activeWorkdayTrip.endedAt === undefined &&
    distanceMiles !== null;

  return {
    activeWorkdayTrip,
    distanceMiles,
    endEndpoint: endpoints.endEndpoint,
    mileageTrackingAvailable,
    ordersLoggedCount,
    returnToStart: endpoints.returnToStart,
    routeCompletedAtMs: completedRecord.timestampMs,
    routeContext,
    routeStartedAtMs,
    startEndpoint: endpoints.startEndpoint,
    storesById,
    visits,
    workdayStartedAtMs,
  };
}
