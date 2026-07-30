import assert from 'node:assert/strict';

import {
  buildFullOrderFromPendingReorder,
  buildPendingOrderForMakeFirst,
  buildPendingOrderForMakeNext,
} from '@/services/route-edit-commands';
import type { StoreVisit } from '@/types/store-visit';

function visit(
  id: string,
  routeOrder: number,
  status: StoreVisit['status'],
): StoreVisit {
  return {
    id,
    storeId: `store-${id}`,
    scheduledDate: '2026-07-25',
    routeOrder,
    status,
    notes: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

const activeRoute = [
  visit('a', 1, 'completed'),
  visit('b', 2, 'current'),
  visit('c', 3, 'pending'),
  visit('d', 4, 'pending'),
];

assert.deepEqual(buildPendingOrderForMakeNext(activeRoute, 'd'), ['c', 'd']);
assert.deepEqual(buildPendingOrderForMakeNext(activeRoute, 'c'), ['c', 'd']);

const allPending = [visit('x', 1, 'pending'), visit('y', 2, 'pending')];
assert.deepEqual(buildPendingOrderForMakeNext(allPending, 'y'), ['y', 'x']);

assert.deepEqual(buildPendingOrderForMakeFirst(allPending, 'y'), ['y', 'x']);
assert.equal(buildPendingOrderForMakeFirst(activeRoute, 'c'), null);

const merged = buildFullOrderFromPendingReorder(activeRoute, [
  visit('d', 4, 'pending'),
  visit('b', 2, 'current'),
  visit('c', 3, 'pending'),
]);
assert.deepEqual(merged, ['a', 'd', 'b', 'c']);

console.log('route-edit-commands.test.ts: ok');
