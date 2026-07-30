import AsyncStorage from '@react-native-async-storage/async-storage';

import { getStores, upsertStore } from '@/services/stores';
import { replaceTodayVisits } from '@/services/store-visits';
import type { SavedRoute, SavedRouteStop } from '@/types/saved-route';
import { createSavedRouteId } from '@/types/saved-route';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { getTodayDateString } from '@/utils/today-date';

export const SAVED_ROUTES_STORAGE_KEY = '@milemate/saved-routes';

function isSavedRouteStop(value: unknown): value is SavedRouteStop {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.storeId === 'string' &&
    typeof record.name === 'string' &&
    typeof record.formattedAddress === 'string' &&
    typeof record.latitude === 'number' &&
    Number.isFinite(record.latitude) &&
    typeof record.longitude === 'number' &&
    Number.isFinite(record.longitude)
  );
}

function isSavedRoute(value: unknown): value is SavedRoute {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    Array.isArray(record.stops) &&
    record.stops.every(isSavedRouteStop) &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

async function readSavedRoutes(): Promise<SavedRoute[]> {
  const stored = await AsyncStorage.getItem(SAVED_ROUTES_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedRoute);
  } catch {
    return [];
  }
}

async function writeSavedRoutes(routes: SavedRoute[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_ROUTES_STORAGE_KEY, JSON.stringify(routes));
}

export async function getSavedRoutes(): Promise<SavedRoute[]> {
  const routes = await readSavedRoutes();

  return [...routes].sort((left, right) => left.name.localeCompare(right.name));
}

export async function ensureDefaultSavedRoutes(): Promise<void> {
  const existing = await readSavedRoutes();

  if (existing.length > 0) {
    return;
  }

  const stores = await getStores();
  const verifiedStores = stores.filter(
    (store) =>
      typeof store.latitude === 'number' &&
      typeof store.longitude === 'number' &&
      Number.isFinite(store.latitude) &&
      Number.isFinite(store.longitude),
  );

  if (verifiedStores.length < 3) {
    return;
  }

  const now = new Date().toISOString();
  const weekdayRoute: SavedRoute = {
    id: createSavedRouteId(),
    name: 'Weekday Route',
    stops: verifiedStores.slice(0, 4).map((store) => storeToSavedRouteStop(store)),
    createdAt: now,
    updatedAt: now,
  };

  await writeSavedRoutes([weekdayRoute]);
}

function storeToSavedRouteStop(store: Store): SavedRouteStop {
  const line2 = store.addressLine2 ? `, ${store.addressLine2}` : '';

  return {
    storeId: store.id,
    name: store.name,
    formattedAddress: `${store.addressLine1}${line2}, ${store.city}, ${store.state} ${store.postalCode}`,
    latitude: store.latitude!,
    longitude: store.longitude!,
  };
}

function createVisitFromSavedStop(
  stop: SavedRouteStop,
  routeOrder: number,
  scheduledDate: string,
): StoreVisit {
  const now = Date.now();

  return {
    id: `visit-${scheduledDate}-${routeOrder}-${stop.storeId}`,
    storeId: stop.storeId,
    scheduledDate,
    routeOrder,
    status: 'pending',
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createStoreFromSavedStop(stop: SavedRouteStop): Store {
  const now = Date.now();
  const [addressLine1, ...rest] = stop.formattedAddress.split(',');

  return {
    id: stop.storeId,
    name: stop.name,
    addressLine1: addressLine1.trim(),
    city: rest[1]?.trim() ?? 'Unknown',
    state: rest[2]?.trim().split(' ')[0] ?? 'NA',
    postalCode: rest[2]?.trim().split(' ').slice(1).join(' ') ?? '',
    latitude: stop.latitude,
    longitude: stop.longitude,
    createdAt: now,
    updatedAt: now,
  };
}

export async function applySavedRouteToToday(savedRoute: SavedRoute): Promise<StoreVisit[]> {
  const scheduledDate = getTodayDateString();

  for (const stop of savedRoute.stops) {
    await upsertStore(createStoreFromSavedStop(stop));
  }

  const visits = savedRoute.stops.map((stop, index) =>
    createVisitFromSavedStop(stop, index + 1, scheduledDate),
  );

  await replaceTodayVisits(visits);

  return visits;
}

export type SavedRouteValidationIssue = {
  stopName: string;
  reason: 'missing_coordinates';
};

export function validateSavedRoute(savedRoute: SavedRoute): SavedRouteValidationIssue[] {
  const issues: SavedRouteValidationIssue[] = [];

  for (const stop of savedRoute.stops) {
    if (
      !Number.isFinite(stop.latitude) ||
      !Number.isFinite(stop.longitude)
    ) {
      issues.push({
        stopName: stop.name,
        reason: 'missing_coordinates',
      });
    }
  }

  return issues;
}
