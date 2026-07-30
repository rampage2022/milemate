export type Store = {
  id: string;
  name: string;
  storeNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  /** Cached reverse-geocode line for display when structured address is missing. */
  reverseGeocodedAddressLine?: string;
  managerName?: string;
  managerPhone?: string;
  createdAt: number;
  updatedAt: number;
};

import {
  hasUsableStructuredAddress,
  resolveStoreDisplayAddressLine,
} from '@/utils/store-display-address-core';

export function formatStoreAddress(store: Store): string {
  if (!hasUsableStructuredAddress(store)) {
    return resolveStoreDisplayAddressLine(store);
  }

  const line2 = store.addressLine2 ? `, ${store.addressLine2}` : '';

  return `${store.addressLine1}${line2}, ${store.city}, ${store.state} ${store.postalCode}`.trim();
}
