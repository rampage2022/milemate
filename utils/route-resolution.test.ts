/**
 * Run with: npx tsx utils/route-resolution.test.ts
 */

import assert from 'node:assert/strict';

import type { StoreVisit } from '@/types/store-visit';
import {
  countRouteStopOutcomes,
  isRouteFullyResolved,
  resolveRouteCompletionHeadline,
  visitHasRemainingRouteWork,
} from '@/utils/route-resolution';

function visit(status: StoreVisit['status'], routeOrder: number): StoreVisit {
  return {
    id: `visit-${routeOrder}`,
    storeId: `store-${routeOrder}`,
    scheduledDate: '2026-07-22',
    routeOrder,
    status,
    notes: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

assert.equal(isRouteFullyResolved([visit('completed', 1), visit('skipped', 2)]), true);
assert.equal(isRouteFullyResolved([visit('completed', 1), visit('pending', 2)]), false);

assert.equal(
  visitHasRemainingRouteWork([visit('completed', 1), visit('current', 2)], 1),
  true,
);

const outcomes = countRouteStopOutcomes([
  visit('completed', 1),
  visit('completed', 2),
  visit('skipped', 3),
  visit('skipped', 4),
  visit('pending', 5),
  visit('current', 6),
]);

assert.equal(outcomes.completed, 2);
assert.equal(outcomes.skipped, 2);
assert.equal(outcomes.unresolved, 2);
assert.equal(outcomes.totalScheduled, 6);

const finishedHeadline = resolveRouteCompletionHeadline({
  hasScheduledStops: true,
  outcomes: countRouteStopOutcomes([
    visit('completed', 1),
    visit('skipped', 2),
  ]),
});

assert.equal(finishedHeadline.title, 'Route Finished');

const completeHeadline = resolveRouteCompletionHeadline({
  hasScheduledStops: true,
  outcomes: countRouteStopOutcomes([
    visit('completed', 1),
    visit('completed', 2),
  ]),
});

assert.equal(completeHeadline.title, 'Route Complete');

console.log('route-resolution.test.ts: ok');
