/**
 * Run with: npx tsx utils/store-location-preview-urls.test.ts
 */

import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import { resolveVisitLogStoreLocationQuery } from '@/utils/visit-log-store-location-action';
import {
  assertStoreLocationPreviewUrlsArePlaceMode,
  buildStoreLocationPreviewUrlCandidatesForPlatform,
  urlLooksLikeDirectionsMode,
} from '@/utils/store-location-preview-urls';

function baseStore(partial: Partial<Store>): Store {
  return {
    id: 'store-1',
    name: 'Wrong Name For Identity',
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
assert.equal(resolveVisitLogStoreLocationQuery(withCoords)!.kind, 'coordinates');

const iosUrls = buildStoreLocationPreviewUrlCandidatesForPlatform(withCoords, 'ios');
assertStoreLocationPreviewUrlsArePlaceMode(iosUrls);
const appleUrls = iosUrls.filter((url) => url.includes('maps.apple.com'));
assert.ok(appleUrls.length > 0);
assert.ok(appleUrls.some((url) => url.includes('ll=39.7817,-89.6501')));
assert.ok(appleUrls.every((url) => url.startsWith('https://maps.apple.com')));
assert.ok(!iosUrls.some((url) => url.startsWith('maps://')));
assert.ok(!iosUrls.some((url) => url.includes('daddr=')));
assert.ok(!iosUrls.some((url) => url.includes('saddr=')));
assert.ok(!iosUrls.some((url) => url.includes('dirflg=')));
assert.ok(!iosUrls.some((url) => url.includes('Wrong%20Name%20For%20Identity')));

const googleUrl = buildStoreLocationPreviewUrlCandidatesForPlatform(withCoords, 'web').find((url) =>
  url.includes('google.com/maps/search'),
);
assert.ok(googleUrl);
assert.match(googleUrl!, /query=39\.7817,-89\.6501/);
assert.ok(!googleUrl!.includes('/dir/'));
assert.ok(!urlLooksLikeDirectionsMode(googleUrl!));

const addressOnly = baseStore({});
assert.equal(resolveVisitLogStoreLocationQuery(addressOnly)!.kind, 'address');

const iosAddressUrls = buildStoreLocationPreviewUrlCandidatesForPlatform(addressOnly, 'ios');
assertStoreLocationPreviewUrlsArePlaceMode(iosAddressUrls);
assert.ok(iosAddressUrls.some((url) => url.includes('q=410')));
assert.ok(!iosAddressUrls.some((url) => url.includes('ll=')));

const androidAddressUrls = buildStoreLocationPreviewUrlCandidatesForPlatform(addressOnly, 'android');
assert.ok(androidAddressUrls.some((url) => url.startsWith('geo:')));

console.log('store-location-preview-urls tests passed');
