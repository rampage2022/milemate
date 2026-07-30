import { getStores, saveStores } from '@/services/stores';
import {
  getTodayVisits,
  replaceTodayVisits,
} from '@/services/store-visits';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { getTodayDateString } from '@/utils/today-date';

const SEED_FLAG_KEY = '@milemate/stores-seeded-v1';

function createStore(
  partial: Omit<Store, 'createdAt' | 'updatedAt'>,
): Store {
  const now = Date.now();

  return {
    ...partial,
    createdAt: now,
    updatedAt: now,
  };
}

function createVisit(
  storeId: string,
  routeOrder: number,
  status: StoreVisit['status'],
  scheduledDate: string,
): StoreVisit {
  const now = Date.now();

  return {
    id: `visit-${scheduledDate}-${routeOrder}-${storeId}`,
    storeId,
    scheduledDate,
    routeOrder,
    status,
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
}

const SAMPLE_STORES: Store[] = [
  createStore({
    id: 'store-westside-grocery',
    name: 'Westside Grocery',
    addressLine1: '410 Oak Street',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62704',
    latitude: 39.7817,
    longitude: -89.6501,
  }),
  createStore({
    id: 'store-lakeview-pharmacy',
    name: 'Lakeview Pharmacy',
    addressLine1: '88 Lakeview Ave',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62702',
    latitude: 39.795,
    longitude: -89.644,
  }),
  createStore({
    id: 'store-harbor-market',
    name: 'Harbor Market #142',
    addressLine1: '1200 Industrial Blvd',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62703',
    managerName: 'Alex Morgan',
    latitude: 39.77,
    longitude: -89.63,
  }),
  createStore({
    id: 'store-north-plaza-foods',
    name: 'North Plaza Foods',
    addressLine1: '88 Commerce Dr',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62707',
    latitude: 39.82,
    longitude: -89.66,
  }),
  createStore({
    id: 'store-riverbend-market',
    name: 'Riverbend Market',
    addressLine1: '220 River Rd',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62711',
    latitude: 39.75,
    longitude: -89.68,
  }),
  createStore({
    id: 'store-southside-foods',
    name: 'Southside Foods',
    addressLine1: '15 S Main St',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62712',
    latitude: 39.73,
    longitude: -89.67,
  }),
];

const LARGE_DEMO_ROUTE_STOP_COUNT = 22;
const LARGE_DEMO_COMPLETED_STOPS = 10;

function generateLargeDemoStores(count: number): Store[] {
  const centerLat = 39.7817;
  const centerLng = -89.6501;

  return Array.from({ length: count }, (_, index) => {
    const stopNumber = index + 1;
    const id = `store-demo-stop-${String(stopNumber).padStart(2, '0')}`;
    const angle = (index / count) * Math.PI * 2;
    const radius = 0.018 + (index % 4) * 0.006;
    const latitude = centerLat + Math.cos(angle) * radius;
    const longitude = centerLng + Math.sin(angle) * radius;

    return createStore({
      id,
      name: `Demo Stop ${String(stopNumber).padStart(2, '0')}`,
      addressLine1: `${1000 + stopNumber * 17} Demo Route Blvd`,
      city: 'Springfield',
      state: 'IL',
      postalCode: `6270${stopNumber % 10}`,
      latitude,
      longitude,
    });
  });
}

function buildLargeIncompleteRouteVisits(
  stores: Store[],
  scheduledDate: string = getTodayDateString(),
): StoreVisit[] {
  const currentIndex = LARGE_DEMO_COMPLETED_STOPS;

  return stores.map((store, index) => {
    let status: StoreVisit['status'] = 'pending';

    if (index < LARGE_DEMO_COMPLETED_STOPS) {
      status = 'completed';
    } else if (index === currentIndex) {
      status = 'current';
    }

    return createVisit(store.id, index + 1, status, scheduledDate);
  });
}

function buildIncompleteTodayRouteVisits(
  scheduledDate: string = getTodayDateString(),
): StoreVisit[] {
  return [
    createVisit('store-westside-grocery', 1, 'completed', scheduledDate),
    createVisit('store-lakeview-pharmacy', 2, 'completed', scheduledDate),
    createVisit('store-harbor-market', 3, 'current', scheduledDate),
    createVisit('store-north-plaza-foods', 4, 'pending', scheduledDate),
    createVisit('store-riverbend-market', 5, 'pending', scheduledDate),
    createVisit('store-southside-foods', 6, 'pending', scheduledDate),
  ];
}

function isTodayRouteFinished(visits: StoreVisit[]): boolean {
  if (visits.length === 0) {
    return false;
  }

  return visits.every(
    (visit) => visit.status === 'completed' || visit.status === 'skipped',
  );
}

export async function loadIncompleteTestRoute(): Promise<void> {
  await saveStores(SAMPLE_STORES);
  await replaceTodayVisits(buildIncompleteTodayRouteVisits());
}

export async function loadLargeIncompleteTestRoute(
  stopCount: number = LARGE_DEMO_ROUTE_STOP_COUNT,
): Promise<void> {
  const stores = generateLargeDemoStores(stopCount);
  await saveStores(stores);
  await replaceTodayVisits(buildLargeIncompleteRouteVisits(stores));
}

async function ensureIncompleteTestRouteForToday(): Promise<void> {
  const todayVisits = await getTodayVisits();

  if (!isTodayRouteFinished(todayVisits)) {
    return;
  }

  await loadIncompleteTestRoute();
}

export async function ensureStoreSeedData(): Promise<void> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage'))
    .default;

  const seeded = await AsyncStorage.getItem(SEED_FLAG_KEY);

  if (seeded === 'true') {
    if (__DEV__) {
      await ensureIncompleteTestRouteForToday();
    }

    return;
  }

  const existingStores = await getStores();
  const existingTodayVisits = await getTodayVisits();

  if (existingStores.length > 0 && existingTodayVisits.length > 0) {
    await AsyncStorage.setItem(SEED_FLAG_KEY, 'true');

    if (__DEV__) {
      await ensureIncompleteTestRouteForToday();
    }

    return;
  }

  await loadIncompleteTestRoute();
  await AsyncStorage.setItem(SEED_FLAG_KEY, 'true');
}
