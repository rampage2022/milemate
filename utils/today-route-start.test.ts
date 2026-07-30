import assert from 'node:assert/strict';

import { isTodayRouteStarted } from '@/utils/today-route-start';
import type { StoreVisit } from '@/types/store-visit';

function visit(status: StoreVisit['status']): StoreVisit {
  return {
    id: 'v1',
    storeId: 's1',
    scheduledDate: '2026-07-20',
    routeOrder: 1,
    status,
    notes: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

assert.equal(isTodayRouteStarted([visit('pending'), visit('pending')]), false);
assert.equal(isTodayRouteStarted([visit('current')]), true);
assert.equal(isTodayRouteStarted([visit('checked_in')]), true);
assert.equal(isTodayRouteStarted([visit('completed'), visit('pending')]), true);

console.log('today-route-start tests passed');
