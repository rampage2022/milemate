/**
 * Run with: npx tsx utils/planning-edit-mode.test.ts
 */

import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import {
  shouldClearPlanningEditMode,
  storeAddressChanged,
} from '@/utils/planning-edit-mode';

function createStore(overrides: Partial<Store> = {}): Store {
  return {
    id: 'store-1',
    name: 'Westside Grocery',
    addressLine1: '410 Oak Street',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62704',
    latitude: 39.7817,
    longitude: -89.6501,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function runTests() {
  assert.equal(shouldClearPlanningEditMode(0), true);
  assert.equal(shouldClearPlanningEditMode(2), false);

  const store = createStore();
  assert.equal(storeAddressChanged(store, createStore()), false);
  assert.equal(
    storeAddressChanged(store, createStore({ city: 'Chicago' })),
    true,
  );

  console.log('planning-edit-mode.test.ts: all tests passed');
}

runTests();
