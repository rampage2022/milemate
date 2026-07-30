import assert from 'node:assert/strict';

import type { StoreVisit } from '@/types/store-visit';
import {
  formatRelativeVisitAge,
  resolveLastCompletedVisitForDisplay,
} from '@/utils/store-visit-presentation';

function createVisit(partial: Partial<StoreVisit> & Pick<StoreVisit, 'id' | 'storeId'>): StoreVisit {
  const now = Date.now();

  return {
    scheduledDate: '2026-07-18',
    routeOrder: 1,
    status: 'pending',
    notes: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function runTests() {
  const storeId = 'store-1';
  const visits: StoreVisit[] = [
    createVisit({
      id: 'visit-old',
      storeId,
      status: 'completed',
      completedAt: new Date('2026-07-10T15:00:00').getTime(),
      routeOrder: 1,
    }),
    createVisit({
      id: 'visit-active',
      storeId,
      status: 'checked_in',
      checkedInAt: Date.now(),
      routeOrder: 2,
      scheduledDate: '2026-07-18',
    }),
    createVisit({
      id: 'visit-other-store',
      storeId: 'store-2',
      status: 'completed',
      completedAt: new Date('2026-07-17T15:00:00').getTime(),
    }),
  ];

  const activeVisit = visits[1]!;
  const lastVisit = resolveLastCompletedVisitForDisplay(visits, storeId, activeVisit);

  assert.equal(lastVisit?.id, 'visit-old');

  const completedToday = createVisit({
    id: 'visit-today',
    storeId,
    status: 'completed',
    completedAt: new Date('2026-07-18T16:00:00').getTime(),
    routeOrder: 3,
  });

  const lastWhenFinished = resolveLastCompletedVisitForDisplay(
    [...visits, completedToday],
    storeId,
    null,
  );

  assert.equal(lastWhenFinished?.id, 'visit-today');

  const relative = formatRelativeVisitAge(new Date('2026-07-12T12:00:00').getTime());
  assert.match(relative ?? '', /days ago|Yesterday|Today/);

  console.log('store-visit-presentation tests passed');
}

runTests();
