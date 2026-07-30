import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Store } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { normalizePersistedImportedStore } from '@/utils/store-import/normalize-persisted-store';

const STORES_STORAGE_KEY = '@milemate/stores';

function isStore(value: unknown): value is Store {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.addressLine1 === 'string' &&
    (record.addressLine2 === undefined || typeof record.addressLine2 === 'string') &&
    typeof record.city === 'string' &&
    typeof record.state === 'string' &&
    typeof record.postalCode === 'string' &&
    (record.latitude === undefined || typeof record.latitude === 'number') &&
    (record.longitude === undefined || typeof record.longitude === 'number') &&
    (record.managerName === undefined || typeof record.managerName === 'string') &&
    (record.managerPhone === undefined || typeof record.managerPhone === 'string') &&
    (record.storeNumber === undefined || typeof record.storeNumber === 'string') &&
    (record.reverseGeocodedAddressLine === undefined ||
      typeof record.reverseGeocodedAddressLine === 'string') &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number'
  );
}

async function readStores(): Promise<Store[]> {
  if (storesStorageOverride) {
    return [...storesStorageOverride];
  }

  const stored = await AsyncStorage.getItem(STORES_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isStore);
  } catch {
    return [];
  }
}

async function writeStores(stores: Store[]): Promise<void> {
  if (storesStorageOverride) {
    storesStorageOverride = [...stores];
    return;
  }

  await AsyncStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(stores));
}

async function readStoresNormalized(): Promise<Store[]> {
  const stores = await readStores();
  const normalized = stores.map(normalizePersistedImportedStore);
  const changed = normalized.some((store, index) => store !== stores[index]);

  if (changed) {
    await writeStores(normalized);
  }

  return normalized;
}

export async function getStores(): Promise<Store[]> {
  const stores = await readStoresNormalized();

  return stores.sort((a, b) =>
    getStoreDisplayName(a).localeCompare(getStoreDisplayName(b)),
  );
}

export async function getStoreById(storeId: string): Promise<Store | null> {
  const stores = await readStoresNormalized();

  return stores.find((store) => store.id === storeId) ?? null;
}

export async function saveStores(stores: Store[]): Promise<void> {
  await writeStores(stores);
}

let storesStorageOverride: Store[] | null = null;
let shouldFailNextWrite = false;

export function __setStoresStorageForTests(stores: Store[]): void {
  storesStorageOverride = [...stores];
}

export function __resetStoresStorageForTests(): void {
  storesStorageOverride = null;
  shouldFailNextWrite = false;
}

export function __setStoresWriteFailureForTests(shouldFail: boolean): void {
  shouldFailNextWrite = shouldFail;
}

async function readStoresForImportTests(): Promise<Store[]> {
  if (storesStorageOverride) {
    return [...storesStorageOverride];
  }

  return readStores();
}

async function writeStoresForImportTests(stores: Store[]): Promise<void> {
  if (shouldFailNextWrite) {
    shouldFailNextWrite = false;
    throw new Error('Simulated write failure');
  }

  if (storesStorageOverride) {
    storesStorageOverride = [...stores];
    return;
  }

  await writeStores(stores);
}

export { readStoresForImportTests, writeStoresForImportTests };

export async function deleteStore(storeId: string): Promise<boolean> {
  const stores = await readStoresNormalized();
  const nextStores = stores.filter((store) => store.id !== storeId);

  if (nextStores.length === stores.length) {
    return false;
  }

  await writeStores(nextStores);

  return true;
}

export async function upsertStore(store: Store): Promise<void> {
  const stores = await readStores();
  const index = stores.findIndex((existing) => existing.id === store.id);

  if (index === -1) {
    await writeStores([store, ...stores]);
    return;
  }

  const updated = [...stores];
  updated[index] = store;
  await writeStores(updated);
}
