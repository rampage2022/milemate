/**
 * Run with: npx tsx utils/resolve-saved-location-coordinates.test.ts
 */

import assert from 'node:assert/strict';

import {
  mergeGeocodedCoordinatesIntoSavedLocationInput,
  shouldRegeocodeSavedLocation,
} from '@/utils/resolve-saved-location-coordinates';

function runTests() {
  assert.equal(
    shouldRegeocodeSavedLocation({ label: 'Home', address: '1 Main St' }),
    true,
    'new locations should geocode',
  );

  assert.equal(
    shouldRegeocodeSavedLocation(
      { label: 'Home', address: '1 Main St' },
      { address: '1 Main St', latitude: 32.8, longitude: -96.8 },
    ),
    false,
    'unchanged geocoded address should not re-geocode',
  );

  assert.equal(
    shouldRegeocodeSavedLocation(
      { label: 'Home', address: '2 Main St' },
      { address: '1 Main St', latitude: 32.8, longitude: -96.8 },
    ),
    true,
    'address changes should re-geocode',
  );

  assert.equal(
    shouldRegeocodeSavedLocation(
      { label: 'Home', address: '1 Main St' },
      { address: '1 Main St', latitude: null, longitude: null },
    ),
    true,
    'missing coordinates should geocode',
  );

  const merged = mergeGeocodedCoordinatesIntoSavedLocationInput(
    { label: 'Home', address: '1 Main St' },
    32.8,
    -96.8,
  );

  assert.equal(merged.latitude, 32.8);
  assert.equal(merged.longitude, -96.8);

  console.log('resolve-saved-location-coordinates.test.ts: all tests passed');
}

runTests();
