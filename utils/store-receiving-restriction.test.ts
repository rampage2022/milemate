import assert from 'node:assert/strict';

import {
  __resetStoresStorageForTests,
  __setStoresStorageForTests,
  getStoreById,
  upsertStore,
} from '@/services/stores';
import type { Store } from '@/types/store';
import {
  formatStoreReceivingRestrictionSummary,
  formatVisitLogReceivingMetadataLine,
  normalizeReceivingRestrictionFromStoreRecord,
  normalizeStoreReceivingRestriction,
  toRouteReceivingConstraint,
  validateStoreReceivingRestriction,
} from '@/utils/store-receiving-restriction';

function createStore(partial: Partial<Store> & Pick<Store, 'id'>): Store {
  const now = Date.now();

  return {
    name: 'Test Store',
    addressLine1: '1 Main St',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

async function runTests() {
  assert.deepEqual(normalizeStoreReceivingRestriction(undefined), { type: 'none' });
  assert.deepEqual(normalizeStoreReceivingRestriction(null), { type: 'none' });

  assert.equal(
    formatStoreReceivingRestrictionSummary({ type: 'before', timeMinutes: 14 * 60 }, 'en-US'),
    'Before 2:00 PM',
  );
  assert.equal(
    formatStoreReceivingRestrictionSummary({ type: 'after', timeMinutes: 9 * 60 + 30 }, 'en-US'),
    'After 9:30 AM',
  );
  assert.equal(
    formatStoreReceivingRestrictionSummary(
      { type: 'between', startTimeMinutes: 8 * 60, endTimeMinutes: 13 * 60 },
      'en-US',
    ),
    '8:00 AM–1:00 PM',
  );

  assert.equal(formatVisitLogReceivingMetadataLine({ type: 'none' }), null);

  const invalidBetween = validateStoreReceivingRestriction({
    type: 'between',
    startTimeMinutes: 13 * 60,
    endTimeMinutes: 8 * 60,
  });
  assert.ok(invalidBetween);

  assert.deepEqual(
    toRouteReceivingConstraint({ type: 'before', timeMinutes: 14 * 60 }),
    { kind: 'arrive-before', minuteOfDay: 14 * 60 },
  );
  assert.deepEqual(
    toRouteReceivingConstraint({
      type: 'between',
      startTimeMinutes: 8 * 60,
      endTimeMinutes: 13 * 60,
    }),
    {
      kind: 'arrival-window',
      startMinuteOfDay: 8 * 60,
      endMinuteOfDay: 13 * 60,
    },
  );

  const legacy = normalizeReceivingRestrictionFromStoreRecord({
    receivingHours: 'Before 2:00 PM',
  });
  assert.equal(legacy.type, 'before');
  assert.equal(legacy.type === 'before' ? legacy.timeMinutes : -1, 14 * 60);

  __setStoresStorageForTests([
    createStore({
      id: 'store-save',
      name: 'Save Test',
    }),
  ]);

  const base = (await getStoreById('store-save'))!;
  await upsertStore({
    ...base,
    receivingRestriction: { type: 'before', timeMinutes: 14 * 60 },
    updatedAt: Date.now(),
  });

  const reloaded = await getStoreById('store-save');
  assert.equal(reloaded?.receivingRestriction?.type, 'before');
  if (reloaded?.receivingRestriction?.type === 'before') {
    assert.equal(reloaded.receivingRestriction.timeMinutes, 14 * 60);
  }

  __resetStoresStorageForTests();

  console.log('store-receiving-restriction tests passed');
}

void runTests();
