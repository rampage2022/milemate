/**
 * Run with: npx tsx utils/store-display-address.test.ts
 */

import assert from 'node:assert/strict';

import {
  ADDRESS_UNAVAILABLE_LABEL,
  buildReadableLineFromGeocodeResult,
  hasUsableStructuredAddress,
  isAddressPlaceholder,
  looksLikeCoordinateAddressLine,
  resolveStoreDisplayAddressLine,
} from '@/utils/store-display-address-core';
import type { Store } from '@/types/store';

function baseStore(partial: Partial<Store>): Store {
  return {
    id: 'store-1',
    name: 'Tom Thumb',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

assert.equal(looksLikeCoordinateAddressLine('38.1234, -90.5678'), true);
assert.equal(isAddressPlaceholder('N/A'), true);

assert.equal(
  hasUsableStructuredAddress(
    baseStore({
      addressLine1: '410 Oak Street',
      city: 'Springfield',
      state: 'IL',
    }),
  ),
  true,
);

assert.equal(
  hasUsableStructuredAddress(
    baseStore({
      addressLine1: '38.1234, -90.5678',
      city: 'Springfield',
      state: 'IL',
    }),
  ),
  false,
);

assert.equal(
  resolveStoreDisplayAddressLine(
    baseStore({
      addressLine1: '410 Oak Street',
      city: 'Springfield',
      state: 'IL',
    }),
  ),
  '410 Oak Street',
);

assert.equal(
  resolveStoreDisplayAddressLine(
    baseStore({
      addressLine1: '38.1234, -90.5678',
      latitude: 38.1234,
      longitude: -90.5678,
      reverseGeocodedAddressLine: '410 Oak Street, Springfield, IL 62704',
    }),
  ),
  '410 Oak Street, Springfield, IL 62704',
);

assert.equal(
  resolveStoreDisplayAddressLine(
    baseStore({
      addressLine1: '38.1234, -90.5678',
      latitude: 38.1234,
      longitude: -90.5678,
    }),
  ),
  ADDRESS_UNAVAILABLE_LABEL,
);

assert.equal(
  buildReadableLineFromGeocodeResult({
    streetNumber: '410',
    street: 'Oak Street',
    city: 'Springfield',
    region: 'IL',
    postalCode: '62704',
  }),
  '410 Oak Street, Springfield, IL 62704',
);

console.log('store display address tests passed');
