import assert from 'node:assert/strict';

import { searchStores } from '@/utils/search-stores';
import type { Store } from '@/types/store';

function store(partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'addressLine1' | 'city' | 'state' | 'postalCode'>): Store {
  const now = Date.now();

  return {
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

const stores = [
  store({
    id: '1',
    name: 'Target',
    addressLine1: '123 Main St',
    city: 'Fort Worth',
    state: 'TX',
    postalCode: '76102',
  }),
  store({
    id: '2',
    name: '',
    storeNumber: '2201',
    addressLine1: '456 Oak Ave',
    city: 'Arlington',
    state: 'TX',
    postalCode: '76010',
  }),
  store({
    id: '3',
    name: 'Fresh Mart',
    addressLine1: '789 Pine Road',
    city: 'Plano',
    state: 'TX',
    postalCode: '75024',
  }),
];

assert.equal(searchStores(stores, 'target').length, 1);
assert.equal(searchStores(stores, '76102').length, 1);
assert.equal(searchStores(stores, 'store 2201').length, 1);
assert.equal(searchStores(stores, 'plano').length, 1);
assert.equal(searchStores(stores, 'missing').length, 0);
assert.equal(searchStores(stores, '').length, 3);

console.log('search-stores tests passed');
