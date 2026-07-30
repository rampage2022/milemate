import { formatStoreAddress, type Store } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';

function buildStoreSearchText(store: Store): string {
  return [
    getStoreDisplayName(store),
    store.storeNumber,
    store.addressLine1,
    store.addressLine2,
    store.city,
    store.state,
    store.postalCode,
    formatStoreAddress(store),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function searchStores(stores: Store[], query: string): Store[] {
  const normalizedQuery = query.trim().toLowerCase();

  const sorted = [...stores].sort((left, right) =>
    getStoreDisplayName(left).localeCompare(getStoreDisplayName(right)),
  );

  if (!normalizedQuery) {
    return sorted;
  }

  return sorted.filter((store) => buildStoreSearchText(store).includes(normalizedQuery));
}
