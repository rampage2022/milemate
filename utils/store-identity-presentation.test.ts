/**
 * Run with: npx tsx utils/store-identity-presentation.test.ts
 */

import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import {
  buildVisitLogStoreIdentity,
  dedupeRepeatedStreetFragments,
  formatStructuredStoreMailingAddress,
  hasRealStoreName,
} from '@/utils/store-identity-presentation';

function baseStore(partial: Partial<Store>): Store {
  return {
    id: 'store-1',
    name: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

assert.equal(
  buildVisitLogStoreIdentity(
    baseStore({
      name: 'Riverbend Market',
      addressLine1: '220 River Rd',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62711',
    }),
  ).title,
  'Riverbend Market',
);

assert.match(
  buildVisitLogStoreIdentity(
    baseStore({
      name: 'Riverbend Market',
      addressLine1: '220 River Rd',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62711',
    }),
  ).addressLine,
  /220 River Rd, Springfield, IL 62711/,
);

const addressOnly = buildVisitLogStoreIdentity(
  baseStore({
    name: '',
    addressLine1: '3811 Spring Hollow Dr',
    city: 'Carrollton',
    state: 'TX',
    postalCode: '75007',
  }),
);

assert.equal(addressOnly.title, '3811 Spring Hollow Dr');
assert.equal(
  addressOnly.addressLine,
  '3811 Spring Hollow Dr, Carrollton, TX 75007',
);

assert.equal(
  dedupeRepeatedStreetFragments('3811 Spring Hollow Dr Spring Hollow Dr 3811'),
  '3811 Spring Hollow Dr 3811',
);

assert.equal(
  formatStructuredStoreMailingAddress(
    baseStore({
      addressLine1: '3811 Spring Hollow Dr Spring Hollow Dr 3811',
      city: 'Carrollton',
      state: 'TX',
      postalCode: '75007',
    }),
  ),
  '3811 Spring Hollow Dr 3811, Carrollton, TX 75007',
);

assert.equal(
  formatStructuredStoreMailingAddress(
    baseStore({
      addressLine1: '220 River Rd',
      city: 'Springfield',
      state: '',
      postalCode: '62711',
    }),
  ),
  '220 River Rd, Springfield 62711',
);

assert.equal(
  formatStructuredStoreMailingAddress(
    baseStore({
      addressLine1: '220 River Rd',
      city: '',
      state: 'IL',
      postalCode: '',
    }),
  ),
  '220 River Rd, IL',
);

assert.equal(
  formatStructuredStoreMailingAddress(
    baseStore({
      addressLine1: '220 River Rd,',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62711',
    }),
  ),
  '220 River Rd, Springfield, IL 62711',
);

assert.equal(hasRealStoreName(baseStore({ name: '   ', addressLine1: '1 Main St', city: 'Austin', state: 'TX' })), false);

assert.equal(
  hasRealStoreName(
    baseStore({
      name: 'Spring Hollow Dr 3811',
      addressLine1: '3811 Spring Hollow Dr',
      city: 'Carrollton',
      state: 'TX',
    }),
  ),
  false,
);

console.log('store-identity-presentation tests passed');
