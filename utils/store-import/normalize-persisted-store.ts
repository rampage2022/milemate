import type { Store } from '@/types/store';
import {
  hasValidImportCoordinates,
  parseCoordinatePair,
  sanitizeImportedAddressComponent,
} from '@/utils/store-import/normalize-import-coordinates';
import { looksLikeCoordinateAddressLine } from '@/utils/store-display-address-core';

/** Repair legacy imported stores (coords in address fields, placeholders, string coords). */
export function normalizePersistedImportedStore(store: Store): Store {
  let addressLine1 = sanitizeImportedAddressComponent(store.addressLine1);
  const city = sanitizeImportedAddressComponent(store.city);
  const state = sanitizeImportedAddressComponent(store.state);
  const postalCode = sanitizeImportedAddressComponent(store.postalCode);

  let latitude = store.latitude;
  let longitude = store.longitude;

  if (!hasValidImportCoordinates({ latitude, longitude })) {
    const pair = parseCoordinatePair(addressLine1);
    if (pair) {
      latitude = pair.latitude;
      longitude = pair.longitude;
      addressLine1 = '';
    }
  } else if (looksLikeCoordinateAddressLine(addressLine1)) {
    addressLine1 = '';
  }

  const changed =
    addressLine1 !== store.addressLine1 ||
    city !== store.city ||
    state !== store.state ||
    postalCode !== store.postalCode ||
    latitude !== store.latitude ||
    longitude !== store.longitude;

  if (!changed) {
    return store;
  }

  return {
    ...store,
    addressLine1,
    city,
    state,
    postalCode,
    latitude,
    longitude,
    updatedAt: Date.now(),
  };
}
