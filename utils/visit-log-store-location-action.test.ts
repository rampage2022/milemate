/**
 * Run with: npx tsx utils/visit-log-store-location-action.test.ts
 */

import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import {
  canOpenVisitLogStoreLocation,
  resolveVisitLogStoreLocationQuery,
} from '@/utils/visit-log-store-location-action';
import { buildStoreLocationPreviewUrlCandidatesForPlatform } from '@/utils/store-location-preview-urls';

function baseStore(partial: Partial<Store>): Store {
  return {
    id: 'store-1',
    name: 'Demo Store',
    addressLine1: '410 Oak Street',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62704',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

const withCoords = baseStore({ latitude: 39.7817, longitude: -89.6501 });
const coordQuery = resolveVisitLogStoreLocationQuery(withCoords);
assert.ok(coordQuery);
assert.equal(coordQuery!.kind, 'coordinates');

const addressOnly = baseStore({});
const addressQuery = resolveVisitLogStoreLocationQuery(addressOnly);
assert.ok(addressQuery);
assert.equal(addressQuery!.kind, 'address');
assert.match(addressQuery!.query, /410 Oak Street/);

const invalid = baseStore({
  addressLine1: 'n/a',
  city: '',
  state: '',
  postalCode: '',
});
assert.equal(resolveVisitLogStoreLocationQuery(invalid), null);
assert.equal(canOpenVisitLogStoreLocation(invalid), false);

const previewUrls = buildStoreLocationPreviewUrlCandidatesForPlatform(withCoords, 'ios');
assert.ok(previewUrls.length > 0);
assert.ok(previewUrls.some((url) => url.includes('39.7817')));
assert.ok(previewUrls.some((url) => url.includes('ll=39.7817,-89.6501')));
assert.ok(!previewUrls.some((url) => url.includes('daddr=')));
assert.ok(!previewUrls.some((url) => url.includes('google.navigation')));
assert.ok(!previewUrls.some((url) => url.includes('/dir/?')));

const addressUrls = buildStoreLocationPreviewUrlCandidatesForPlatform(addressOnly, 'android');
assert.ok(addressUrls.length > 0);
assert.ok(addressUrls.some((url) => url.startsWith('geo:')));

console.log('visit-log-store-location-action tests passed');
