import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import {
  buildDuplicateStoreClusters,
  buildStoreIdRemapFromClusters,
  resolveRemappedStoreId,
  storesLikelyRepresentSameLocation,
} from '@/utils/store-duplicate-clusters';

const oldStore: Store = {
  id: 'store-old',
  name: 'Harbor Market',
  storeNumber: '142',
  addressLine1: '1200 Industrial Blvd',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62703',
  latitude: 39.77,
  longitude: -89.63,
  createdAt: 1,
  updatedAt: 100,
};

const newImportStore: Store = {
  id: 'store-import-new',
  name: 'Harbor Market #142',
  storeNumber: '142',
  addressLine1: '1200 Industrial Blvd',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62703',
  latitude: 39.77,
  longitude: -89.63,
  createdAt: 2,
  updatedAt: 200,
};

assert.equal(storesLikelyRepresentSameLocation(oldStore, newImportStore), true);

const orderCounts = new Map<string, number>([['store-old', 3]]);
const clusters = buildDuplicateStoreClusters([oldStore, newImportStore], orderCounts);

assert.equal(clusters.length, 1);
assert.equal(clusters[0]!.canonicalStoreId, 'store-import-new');

const remap = buildStoreIdRemapFromClusters(clusters);

assert.equal(resolveRemappedStoreId('store-old', remap), 'store-import-new');

console.log('store-duplicate-clusters tests passed');
