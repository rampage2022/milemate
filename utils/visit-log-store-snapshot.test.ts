/**
 * Run with: npx tsx utils/visit-log-store-snapshot.test.ts
 */

import assert from 'node:assert/strict';

import type { StoreOrder } from '@/types/store-order';
import type { StoreVisit } from '@/types/store-visit';
import { buildVisitLogStoreSnapshot } from '@/utils/visit-log-store-snapshot';

function visit(partial: Partial<StoreVisit> & Pick<StoreVisit, 'id' | 'storeId'>): StoreVisit {
  return {
    scheduledDate: '08-02-26',
    routeOrder: 1,
    status: 'checked_in',
    notes: [],
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

const storeA = 'store-a';
const storeB = 'store-b';

const lastCompleted = visit({
  id: 'visit-completed',
  storeId: storeA,
  status: 'completed',
  completedAt: Date.parse('2026-07-24T14:30:00'),
  visitDurationMs: 25 * 60 * 1000,
});

const activeCheckedIn = visit({
  id: 'visit-active',
  storeId: storeA,
  status: 'checked_in',
  checkedInAt: Date.now(),
  notes: [
    { id: 'n1', text: 'Left samples at front desk.', createdAt: 2 },
    { id: 'n2', text: 'Second note.', createdAt: 3 },
  ],
});

const pendingToday: StoreOrder = {
  id: 'order-1',
  storeId: storeA,
  placedAt: '08-01-26',
  expectedDeliveryDate: '08-02-26',
  status: 'pending',
  createdAt: '08-01-26',
  updatedAt: '08-01-26',
};

const snapshot = buildVisitLogStoreSnapshot({
  canonicalStoreId: storeA,
  lastCompletedVisit: lastCompleted,
  latestNotReceivedChecksByOrderId: {},
  orderHistory: [],
  pendingOrders: [pendingToday],
  visit: activeCheckedIn,
});

assert.equal(snapshot.collapsedItems.length, 3);
assert.equal(snapshot.collapsedItems[0]?.text, 'Jul 24');
assert.equal(snapshot.collapsedItems[1]?.text, 'Due today');
assert.equal(snapshot.collapsedItems[1]?.tone, 'orange');
assert.equal(snapshot.collapsedItems[2]?.text, '2 notes');
assert.ok(snapshot.lastVisitRow);
assert.equal(snapshot.lastVisitRow?.label, 'Last visit');
assert.ok(!snapshot.collapsedItems.some((item) => item.text.includes('Checked In')));

const empty = buildVisitLogStoreSnapshot({
  canonicalStoreId: storeA,
  lastCompletedVisit: null,
  latestNotReceivedChecksByOrderId: {},
  orderHistory: [],
  pendingOrders: [],
  visit: visit({ id: 'visit-empty', storeId: storeA, notes: [] }),
});
assert.equal(empty.emptyMessage, 'No store activity yet');
assert.equal(empty.hasAnyActivity, false);

assert.throws(() => {
  buildVisitLogStoreSnapshot({
    canonicalStoreId: storeA,
    lastCompletedVisit: null,
    latestNotReceivedChecksByOrderId: {},
    orderHistory: [],
    pendingOrders: [],
    visit: visit({ id: 'visit-b', storeId: storeB, notes: [] }),
  });
});

console.log('visit-log-store-snapshot tests passed');
