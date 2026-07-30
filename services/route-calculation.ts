import { geocodeStoreIfNeeded } from '@/services/store-geocoding';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { getStoreById, upsertStore } from '@/services/stores';
import { invalidateRoutePlanningEstimate } from '@/services/route-planning';
import {
  getTodayVisits,
  replaceTodayVisits,
} from '@/services/store-visits';
import {
  canRemoveVisitDuringActiveRoute,
  canReorderVisitDuringActiveRoute,
  mergeReorderedPendingVisitIds,
} from '@/utils/active-route-editing';
import type { RouteLocation } from '@/types/route-location';
import type { RouteMapCoordinate } from '@/types/route-planning';
import { createRouteLocationId } from '@/types/route-location';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { getTodayDateString } from '@/utils/today-date';
import {
  buildPlannedRouteEstimate,
  optimizeStopOrder,
  storeToOptimizableStop,
  type OptimizableStop,
} from '@/utils/route-optimization';
import { resolveDrivingRoutePolyline } from '@/utils/resolve-driving-route-polyline';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';

export type RouteCalculationStep =
  | 'loading_stops'
  | 'optimizing_route'
  | 'calculating_mileage'
  | 'estimating_drive_time';

export type RouteCalculationProgress = {
  step: RouteCalculationStep;
  completedSteps: RouteCalculationStep[];
};

export type RouteCalculationResult =
  | {
      ok: true;
      orderedVisitIds: string[];
      estimate: ReturnType<typeof buildPlannedRouteEstimate>;
      startLocation: RouteLocation;
      endLocation: RouteLocation;
      drivingPolyline: RouteMapCoordinate[] | null;
    }
  | {
      ok: false;
      reason: 'missing_stop_coordinates' | 'invalid_endpoints';
      message: string;
    };

function createStoreId(): string {
  return `store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function splitFormattedAddress(formattedAddress: string): {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
} {
  const parts = formattedAddress
    .split('\n')
    .flatMap((line) => line.split(','))
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      addressLine1: formattedAddress.trim(),
      city: '',
      state: '',
      postalCode: '',
    };
  }

  const addressLine1 = parts[0];
  const city = parts[1] ?? '';
  const statePostal = parts[2] ?? '';
  const [state = '', ...postalParts] = statePostal.split(/\s+/);

  return {
    addressLine1,
    city,
    state,
    postalCode: postalParts.join(' '),
  };
}

export async function createStoreFromRouteLocation(
  location: RouteLocation,
): Promise<Store> {
  const now = Date.now();
  const parsed = splitFormattedAddress(location.formattedAddress);

  const store: Store = {
    id: createStoreId(),
    name: location.name?.trim() || parsed.addressLine1 || 'Stop',
    addressLine1: parsed.addressLine1,
    city: parsed.city || 'Unknown',
    state: parsed.state || 'NA',
    postalCode: parsed.postalCode,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAt: now,
    updatedAt: now,
  };

  await upsertStore(store);

  return store;
}

async function invalidatePlanningEstimateAfterStopChange(): Promise<void> {
  await invalidateRoutePlanningEstimate();
}

export async function addManualStopToTodayRoute(
  location: RouteLocation,
): Promise<{ visit: StoreVisit; store: Store }> {
  const scheduledDate = getTodayDateString();
  const store = await createStoreFromRouteLocation(location);
  const visits = await getTodayVisits();
  const routeOrder = visits.length + 1;
  const now = Date.now();

  const visit: StoreVisit = {
    id: `visit-${scheduledDate}-${routeOrder}-${store.id}`,
    storeId: store.id,
    scheduledDate,
    routeOrder,
    status: 'pending',
    notes: [],
    createdAt: now,
    updatedAt: now,
  };

  await replaceTodayVisits([...visits, visit]);
  await invalidatePlanningEstimateAfterStopChange();

  return { visit, store };
}

export async function addExistingStoreToTodayRoute(
  storeId: string,
): Promise<{ visit: StoreVisit; store: Store }> {
  const store = await getStoreById(storeId);

  if (!store) {
    throw new Error('Store not found.');
  }

  const geocodedStore = await geocodeStoreIfNeeded(store);

  const scheduledDate = getTodayDateString();
  const visits = await getTodayVisits();

  if (visits.some((visit) => visit.storeId === storeId)) {
    throw new Error('This stop is already on today\u2019s route.');
  }

  const routeOrder = visits.length + 1;
  const now = Date.now();

  const visit: StoreVisit = {
    id: `visit-${scheduledDate}-${routeOrder}-${geocodedStore.id}`,
    storeId: geocodedStore.id,
    scheduledDate,
    routeOrder,
    status: 'pending',
    notes: [],
    createdAt: now,
    updatedAt: now,
  };

  await replaceTodayVisits([...visits, visit]);
  await invalidatePlanningEstimateAfterStopChange();

  return { visit, store: geocodedStore };
}

export async function addExistingStoresToTodayRoute(
  storeIds: string[],
): Promise<{ visits: StoreVisit[]; stores: Store[] }> {
  const uniqueStoreIds = [...new Set(storeIds)];

  if (uniqueStoreIds.length === 0) {
    throw new Error('Select at least one location.');
  }

  const scheduledDate = getTodayDateString();
  const visits = await getTodayVisits();
  const existingStoreIds = new Set(visits.map((visit) => visit.storeId));
  const now = Date.now();
  let routeOrder = visits.length;
  const addedVisits: StoreVisit[] = [];
  const addedStores: Store[] = [];

  for (const storeId of uniqueStoreIds) {
    if (existingStoreIds.has(storeId)) {
      continue;
    }

    const store = await getStoreById(storeId);

    if (!store) {
      continue;
    }

    const geocodedStore = await geocodeStoreIfNeeded(store);

    routeOrder += 1;

    addedVisits.push({
      id: `visit-${scheduledDate}-${routeOrder}-${geocodedStore.id}`,
      storeId: geocodedStore.id,
      scheduledDate,
      routeOrder,
      status: 'pending',
      notes: [],
      createdAt: now,
      updatedAt: now,
    });
    addedStores.push(geocodedStore);
    existingStoreIds.add(storeId);
  }

  if (addedVisits.length === 0) {
    throw new Error('These stops are already on today\u2019s route.');
  }

  await replaceTodayVisits([...visits, ...addedVisits]);
  await invalidatePlanningEstimateAfterStopChange();

  return { visits: addedVisits, stores: addedStores };
}

export async function clearTodayRouteStops(): Promise<void> {
  const visits = await getTodayVisits();
  const resolvedHistory = visits.filter(
    (visit) => visit.status === 'completed' || visit.status === 'skipped',
  );

  await replaceTodayVisits(resolvedHistory);
  await invalidatePlanningEstimateAfterStopChange();
}

export async function removeStopFromTodayRoute(visitId: string): Promise<void> {
  const scheduledDate = getTodayDateString();
  const visits = await getTodayVisits();
  const target = visits.find((visit) => visit.id === visitId);

  if (target && !canRemoveVisitDuringActiveRoute(target)) {
    return;
  }

  const filtered = visits.filter((visit) => visit.id !== visitId);
  const reordered = filtered.map((visit, index) => ({
    ...visit,
    routeOrder: index + 1,
    updatedAt: Date.now(),
  }));

  await replaceTodayVisits(reordered);
  await invalidatePlanningEstimateAfterStopChange();
}

export async function moveStopInTodayRoute(
  visitId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const visits = [...(await getTodayVisits())].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );
  const index = visits.findIndex((visit) => visit.id === visitId);

  if (index === -1) {
    return;
  }

  const moving = visits[index]!;

  if (!canReorderVisitDuringActiveRoute(moving)) {
    return;
  }

  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= visits.length) {
    return;
  }

  const targetVisit = visits[targetIndex]!;

  if (!canReorderVisitDuringActiveRoute(targetVisit)) {
    return;
  }

  const next = [...visits];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);

  const reordered = next.map((visit, orderIndex) => ({
    ...visit,
    routeOrder: orderIndex + 1,
    updatedAt: Date.now(),
  }));

  await replaceTodayVisits(reordered);
  await invalidatePlanningEstimateAfterStopChange();
}

export async function reorderTodayRouteVisits(
  orderedVisitIds: string[],
  options?: { duringActiveWorkday?: boolean },
): Promise<void> {
  const visits = await getTodayVisits();
  const visitMap = new Map(visits.map((visit) => [visit.id, visit]));
  const now = Date.now();

  const finalOrder =
    options?.duringActiveWorkday === true
      ? mergeReorderedPendingVisitIds({
          visits,
          orderedPendingVisitIds: orderedVisitIds,
        })
      : orderedVisitIds;

  const reordered = finalOrder
    .map((visitId, index) => {
      const visit = visitMap.get(visitId);

      if (!visit) {
        return null;
      }

      return {
        ...visit,
        routeOrder: index + 1,
        updatedAt: now,
      };
    })
    .filter((visit): visit is StoreVisit => visit !== null);

  if (reordered.length !== visits.length) {
    return;
  }

  await replaceTodayVisits(reordered);
  await invalidatePlanningEstimateAfterStopChange();
}

export async function applyOptimizedVisitOrder(
  orderedVisitIds: string[],
): Promise<void> {
  const visits = await getTodayVisits();
  const visitMap = new Map(visits.map((visit) => [visit.id, visit]));
  const now = Date.now();

  const reordered: StoreVisit[] = orderedVisitIds
    .map((visitId, index) => {
      const visit = visitMap.get(visitId);

      if (!visit) {
        return null;
      }

      return {
        ...visit,
        routeOrder: index + 1,
        status: 'pending' as StoreVisit['status'],
        updatedAt: now,
      };
    })
    .filter((visit): visit is StoreVisit => visit !== null);

  const untouched = visits.filter(
    (visit) => !orderedVisitIds.includes(visit.id),
  );

  await replaceTodayVisits([...reordered, ...untouched]);
}

async function loadOptimizableStops(
  visits: StoreVisit[],
): Promise<{ stops: OptimizableStop[]; missingStoreNames: string[] }> {
  const stops: OptimizableStop[] = [];
  const missingStoreNames: string[] = [];
  const remap = await getStoreImportIdRemap();

  for (const visit of visits) {
    const storeId = resolveRemappedStoreId(visit.storeId, remap);
    const store = await getStoreById(storeId);

    if (!store) {
      missingStoreNames.push('Unknown stop');
      continue;
    }

    const optimizable = storeToOptimizableStop(visit.id, store);

    if (!optimizable) {
      missingStoreNames.push(store.name);
      continue;
    }

    stops.push(optimizable);
  }

  return { stops, missingStoreNames };
}

export async function calculateTodayRoute(input: {
  startLocation: RouteLocation;
  endLocation: RouteLocation;
  onProgress?: (progress: RouteCalculationProgress) => void;
}): Promise<RouteCalculationResult> {
  const visits = await getTodayVisits();
  const completedSteps: RouteCalculationStep[] = [];

  input.onProgress?.({
    step: 'loading_stops',
    completedSteps,
  });

  const { stops, missingStoreNames } = await loadOptimizableStops(visits);

  if (missingStoreNames.length > 0) {
    return {
      ok: false,
      reason: 'missing_stop_coordinates',
      message: `${missingStoreNames[0]} needs a verified address before route calculation.`,
    };
  }

  completedSteps.push('loading_stops');
  input.onProgress?.({
    step: 'optimizing_route',
    completedSteps,
  });

  const orderedStops = optimizeStopOrder({
    start: input.startLocation,
    end: input.endLocation,
    stops,
  });

  completedSteps.push('optimizing_route');
  input.onProgress?.({
    step: 'calculating_mileage',
    completedSteps,
  });

  const estimate = buildPlannedRouteEstimate({
    start: input.startLocation,
    end: input.endLocation,
    orderedStops,
  });

  completedSteps.push('calculating_mileage');
  input.onProgress?.({
    step: 'estimating_drive_time',
    completedSteps,
  });

  completedSteps.push('estimating_drive_time');

  const drivingPolyline = await resolveDrivingRoutePolyline({
    start: input.startLocation,
    end: input.endLocation,
    orderedStops,
  });

  await applyOptimizedVisitOrder(orderedStops.map((stop) => stop.visitId));

  return {
    ok: true,
    orderedVisitIds: orderedStops.map((stop) => stop.visitId),
    estimate,
    startLocation: input.startLocation,
    endLocation: input.endLocation,
    drivingPolyline,
  };
}

export function routeLocationFromMyLocation(input: {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}): RouteLocation | null {
  if (
    typeof input.latitude !== 'number' ||
    typeof input.longitude !== 'number' ||
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude)
  ) {
    return null;
  }

  return {
    id: input.id,
    name: input.label,
    formattedAddress: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    source: 'profile',
  };
}

export function cloneRouteLocation(location: RouteLocation): RouteLocation {
  return {
    ...location,
    id: createRouteLocationId(),
  };
}
