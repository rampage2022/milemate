import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { routeLocationFromStore } from '@/utils/route-location-from-store';

function sortByRouteOrder(visits: StoreVisit[]): StoreVisit[] {
  return [...visits].sort((left, right) => left.routeOrder - right.routeOrder);
}

function storeAsRouteLocation(store: Store): RouteLocation | null {
  const location = routeLocationFromStore(store);

  return location;
}

/** Leg/chaining origin for remaining stops during an active workday. */
export function resolveActiveWorkdayLegOriginStore(input: {
  startLocation: RouteLocation | null;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
}): Store | null {
  const sorted = sortByRouteOrder(input.visits);
  const checkedIn = sorted.find((visit) => visit.status === 'checked_in');

  if (checkedIn) {
    return input.storesById[checkedIn.storeId] ?? null;
  }

  const lastCompleted = [...sorted]
    .reverse()
    .find((visit) => visit.status === 'completed');

  if (lastCompleted) {
    return input.storesById[lastCompleted.storeId] ?? null;
  }

  if (!input.startLocation) {
    return null;
  }

  const matchingStore = Object.values(input.storesById).find(
    (store) =>
      store.latitude === input.startLocation!.latitude &&
      store.longitude === input.startLocation!.longitude,
  );

  return matchingStore ?? null;
}

/** Route estimate origin: checked-in stop, else workday start location. */
export function resolveActiveWorkdayRouteOriginLocation(input: {
  startLocation: RouteLocation;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
}): RouteLocation {
  const sorted = sortByRouteOrder(input.visits);
  const checkedIn = sorted.find((visit) => visit.status === 'checked_in');

  if (checkedIn) {
    const store = input.storesById[checkedIn.storeId];
    const fromStore = store ? storeAsRouteLocation(store) : null;

    if (fromStore) {
      return fromStore;
    }
  }

  return input.startLocation;
}

export function resolvePreviousStoreForRouteLeg(input: {
  originStore: Store | null;
  storesById: Record<string, Store>;
  targetVisitId: string;
  visits: StoreVisit[];
}): Store | undefined {
  const sorted = sortByRouteOrder(input.visits);
  const targetIndex = sorted.findIndex((visit) => visit.id === input.targetVisitId);

  if (targetIndex <= 0) {
    return input.originStore ?? undefined;
  }

  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const visit = sorted[index]!;

    if (visit.status === 'skipped') {
      continue;
    }

    return input.storesById[visit.storeId] ?? input.originStore ?? undefined;
  }

  return input.originStore ?? undefined;
}

export function resolveNextStopVisitIdForActiveWorkdayReorder(
  visits: StoreVisit[],
): string | null {
  const sorted = sortByRouteOrder(visits);
  const checkedIn = sorted.find((visit) => visit.status === 'checked_in');

  if (checkedIn) {
    const nextPending = sorted.find(
      (visit) =>
        visit.status === 'pending' && visit.routeOrder > checkedIn.routeOrder,
    );

    return nextPending?.id ?? null;
  }

  const nextStop = sorted.find(
    (visit) =>
      visit.status === 'pending' ||
      visit.status === 'current' ||
      visit.status === 'checked_in',
  );

  return nextStop?.id ?? null;
}

export function isVisitCheckedInForActiveWorkdayReorder(visit: StoreVisit): boolean {
  return visit.status === 'checked_in';
}
