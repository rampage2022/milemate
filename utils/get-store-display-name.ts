import type { Store } from '@/types/store';

type StoreDisplayInput = Pick<
  Store,
  'name' | 'storeNumber' | 'addressLine1'
>;

export function getStoreDisplayName(store: StoreDisplayInput): string {
  const trimmedName = store.name.trim();

  if (trimmedName.length > 0) {
    return trimmedName;
  }

  const trimmedNumber = store.storeNumber?.trim();

  if (trimmedNumber) {
    return `Store ${trimmedNumber}`;
  }

  const trimmedAddress = store.addressLine1.trim();

  if (trimmedAddress.length > 0) {
    return trimmedAddress;
  }

  return 'Imported Store';
}
