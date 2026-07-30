import { geocodeAddressForConfirmation } from '@/services/address-geocoding';
import { getStoreById, upsertStore } from '@/services/stores';
import type { Store } from '@/types/store';
import { formatStoreAddress } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

export function storeHasVerifiedCoordinates(store: Store): boolean {
  return (
    typeof store.latitude === 'number' &&
    typeof store.longitude === 'number' &&
    Number.isFinite(store.latitude) &&
    Number.isFinite(store.longitude)
  );
}

export async function geocodeStoreIfNeeded(store: Store): Promise<Store> {
  if (storeHasVerifiedCoordinates(store)) {
    return store;
  }

  const result = await geocodeAddressForConfirmation(formatStoreAddress(store));

  if (result.status !== 'success') {
    return store;
  }

  const updated: Store = {
    ...store,
    latitude: result.confirmation.latitude,
    longitude: result.confirmation.longitude,
    updatedAt: Date.now(),
  };

  await upsertStore(updated);

  return updated;
}

export async function geocodeStoresForTodayVisits(
  visits: StoreVisit[],
): Promise<Record<string, Store>> {
  const storesById: Record<string, Store> = {};
  const uniqueStoreIds = [...new Set(visits.map((visit) => visit.storeId))];

  for (const storeId of uniqueStoreIds) {
    const existing = await getStoreById(storeId);

    if (!existing) {
      continue;
    }

    storesById[storeId] = await geocodeStoreIfNeeded(existing);
  }

  return storesById;
}

export function countStoresMissingCoordinates(
  visits: StoreVisit[],
  storesById: Record<string, Store>,
): number {
  return visits.filter((visit) => {
    const store = storesById[visit.storeId];

    return !store || !storeHasVerifiedCoordinates(store);
  }).length;
}
