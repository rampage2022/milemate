/**
 * Run with: npx tsx utils/stop-display-status.test.ts
 */

import assert from 'node:assert/strict';

import type { StoreVisit } from '@/types/store-visit';
import {
  getStopDisplayStatus,
  getStopDisplayStatusLabel,
  isActiveStopVisit,
  StopDisplayStatusLabels,
} from '@/utils/stop-display-status';

function createVisit(overrides: Partial<StoreVisit> = {}): StoreVisit {
  return {
    id: 'visit-1',
    storeId: 'store-1',
    scheduledDate: '2026-07-19',
    routeOrder: 1,
    status: 'pending',
    notes: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function runTests() {
  assert.equal(
    getStopDisplayStatus({
      visit: createVisit({ status: 'current' }),
      isActiveStop: true,
      hasArrived: false,
      arrivalStatus: 'outside',
    }),
    'en_route',
  );

  assert.equal(
    getStopDisplayStatusLabel(
      getStopDisplayStatus({
        visit: createVisit({ status: 'current' }),
        isActiveStop: true,
      }),
    ),
    StopDisplayStatusLabels.en_route,
  );

  assert.equal(
    getStopDisplayStatus({
      visit: createVisit({ status: 'current' }),
      isActiveStop: true,
      hasArrived: true,
    }),
    'arriving',
  );

  assert.equal(
    getStopDisplayStatus({
      visit: createVisit({ status: 'current' }),
      isActiveStop: true,
      arrivalStatus: 'dwelling',
    }),
    'arriving',
  );

  assert.equal(
    getStopDisplayStatus({
      visit: createVisit({ status: 'checked_in' }),
      isActiveStop: true,
    }),
    'checked_in',
  );

  assert.equal(
    getStopDisplayStatus({
      visit: createVisit({ status: 'completed' }),
      isActiveStop: true,
      hasArrived: true,
    }),
    'completed',
  );

  assert.equal(
    getStopDisplayStatus({
      visit: createVisit({ id: 'visit-2', status: 'pending' }),
      isActiveStop: false,
    }),
    null,
  );

  assert.equal(
    getStopDisplayStatusLabel(null),
    null,
    'future stops have no status label',
  );

  assert.equal(
    isActiveStopVisit({
      currentVisitId: 'visit-1',
      visit: createVisit({ id: 'visit-1', status: 'current' }),
    }),
    true,
  );

  assert.equal(
    isActiveStopVisit({
      currentVisitId: 'visit-1',
      visit: createVisit({ id: 'visit-2', status: 'pending' }),
    }),
    false,
  );

  console.log('stop-display-status.test.ts: all tests passed');
}

runTests();
