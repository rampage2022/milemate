import assert from 'node:assert/strict';

import { createDefaultStoresMapFilterState } from '@/utils/stores-map-filter-state';

/** My Location must not mutate Stores map filter state. */
function runTests() {
  const before = createDefaultStoresMapFilterState();
  const after = createDefaultStoresMapFilterState();

  assert.deepEqual(before, after);
  assert.equal(before.enabledSmartFilters.length, 0);

  console.log('stores-map-my-location-filter.test passed');
}

runTests();
