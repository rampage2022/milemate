/**
 * Tests for utils/my-locations.ts
 *
 * Run with: npx tsx utils/my-locations.test.ts
 */

import assert from 'node:assert/strict';

import {
  buildSavedLocationRecord,
  sanitizeLatitude,
  sanitizeLongitude,
  sanitizeSavedLocation,
  validateSavedLocationInput,
} from './my-locations';

function runTests(): void {
  assert.equal(validateSavedLocationInput({ label: '', address: '123 Main' }), 'blank_label');
  assert.equal(validateSavedLocationInput({ label: 'Home', address: '   ' }), 'blank_address');
  assert.equal(
    validateSavedLocationInput({ label: 'Home', address: '123 Main', latitude: 120 }),
    'invalid_latitude',
  );
  assert.equal(
    validateSavedLocationInput({ label: 'Home', address: '123 Main', longitude: 200 }),
    'invalid_longitude',
  );
  assert.equal(
    validateSavedLocationInput({ label: 'Home', address: '123 Main' }),
    null,
  );

  assert.equal(sanitizeLatitude(39.7), 39.7);
  assert.equal(sanitizeLatitude(120), null);
  assert.equal(sanitizeLongitude(-89.6), -89.6);
  assert.equal(sanitizeLongitude(200), null);

  assert.equal(sanitizeSavedLocation(null), null);
  assert.equal(sanitizeSavedLocation({ id: '', label: 'Home', address: '123' }), null);
  assert.equal(
    sanitizeSavedLocation({ id: 'loc-1', label: '  ', address: '123 Main' }),
    null,
  );

  const malformed = sanitizeSavedLocation({
    id: 'loc-1',
    label: 'Home',
    address: '123 Main',
    latitude: 'bad',
    longitude: 999,
    createdAt: 1000,
    updatedAt: 2000,
  });

  assert.ok(malformed);
  assert.equal(malformed?.latitude, null);
  assert.equal(malformed?.longitude, null);
  assert.equal(typeof malformed?.createdAt, 'string');

  const first = buildSavedLocationRecord({
    label: 'Home',
    address: '123 Main St',
  });
  const second = buildSavedLocationRecord({
    label: 'Warehouse',
    address: '456 Industrial Rd',
  });

  assert.notEqual(first.id, second.id);

  console.log('my-locations tests passed');
}

runTests();
