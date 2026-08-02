import assert from 'node:assert/strict';

import type { StoreVisit } from '@/types/store-visit';
import {
  __resetStoreVisitsStorageForTests,
  __setStoreVisitsStorageForTests,
  getTodayVisits,
  skipVisit,
} from '@/services/store-visits';
import { getTodayDateString } from '@/utils/today-date';

function visit(partial: Partial<StoreVisit> & Pick<StoreVisit, 'id'>): StoreVisit {
  const now = Date.now();
  const scheduledDate = getTodayDateString();

  return {
    storeId: 'store-1',
    scheduledDate,
    routeOrder: 1,
    status: 'pending',
    notes: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

async function runTests() {
  __setStoreVisitsStorageForTests([
    visit({ id: 'visit-skip-before', status: 'current', afterCompletionOverride: 'open_directions' }),
  ]);

  const beforeResult = await skipVisit('visit-skip-before', 'store_closed');
  assert.ok(beforeResult);

  let visits = await getTodayVisits();
  let skipped = visits.find((entry) => entry.id === 'visit-skip-before');
  assert.equal(skipped?.status, 'skipped');
  assert.equal(skipped?.skipReason, 'store_closed');
  assert.equal(skipped?.checkedInAt, undefined);

  __setStoreVisitsStorageForTests([
    visit({
      id: 'visit-skip-after',
      status: 'checked_in',
      checkedInAt: 1_000,
      checkInSource: 'manual',
      afterCompletionOverride: 'open_directions',
    }),
  ]);

  const afterResult = await skipVisit('visit-skip-after', 'receiving_closed');
  assert.ok(afterResult);

  visits = await getTodayVisits();
  skipped = visits.find((entry) => entry.id === 'visit-skip-after');
  assert.equal(skipped?.status, 'skipped');
  assert.equal(skipped?.checkInSource, 'manual');
  assert.equal(skipped?.checkedInAt, 1_000);
  assert.ok(typeof skipped?.visitDurationMs === 'number');

  __resetStoreVisitsStorageForTests();
  console.log('store-visits-skip tests passed');
}

void runTests();
