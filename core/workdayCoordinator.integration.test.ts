/**
 * Integration tests for workday coordinator lifecycle wiring.
 *
 * Run with: npx tsx core/workdayCoordinator.integration.test.ts
 */

import assert from 'node:assert/strict';

import { __resetForTests, getState } from './workdayCoordinator';
import {
  buildCoordinatorSnapshotFromVisits,
  resolveCoordinatorCurrentVisit,
} from './workdayCoordinatorMapping';
import {
  __applyCoordinatorSnapshotForTests,
  onWorkdayEndedSuccess,
  syncTrackedMilesFromAuthoritative,
} from '../services/workday-coordinator-integration';
import type { PendingVisitAdvancement } from '../services/pending-advancement';
import type { StoreVisit } from '../types/store-visit';

function createVisit(
  overrides: Partial<StoreVisit> & Pick<StoreVisit, 'id' | 'storeId' | 'routeOrder' | 'status'>,
): StoreVisit {
  return {
    scheduledDate: '2026-07-17',
    notes: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function runTests(): void {
  __resetForTests();

  const visits: StoreVisit[] = [
    createVisit({
      id: 'visit-1',
      storeId: 'store-1',
      routeOrder: 1,
      status: 'completed',
    }),
    createVisit({
      id: 'visit-2',
      storeId: 'store-2',
      routeOrder: 2,
      status: 'current',
    }),
    createVisit({
      id: 'visit-3',
      storeId: 'store-3',
      routeOrder: 3,
      status: 'pending',
    }),
  ];

  const startSnapshot = buildCoordinatorSnapshotFromVisits({
    activeWorkdayId: 'trip-1',
    trackedMiles: 0,
    visits,
    pendingAdvancement: null,
    completionPhase: 'idle',
    currentStoreName: 'Harbor Market',
  });

  __applyCoordinatorSnapshotForTests(startSnapshot, 'startWorkday');
  const afterStart = getState();
  assert.equal(afterStart.activeWorkdayId, 'trip-1');
  assert.equal(afterStart.phase, 'driving');
  assert.equal(afterStart.currentStopIndex, 2, 'currentStopIndex is one-based routeOrder');
  assert.equal(afterStart.completedStopCount, 1);
  assert.equal(afterStart.totalStopCount, 3);
  assert.equal(afterStart.trackedMiles, 0);

  __resetForTests();
  assert.equal(getState().phase, 'idle', 'failed start leaves coordinator idle when not updated');

  __applyCoordinatorSnapshotForTests(startSnapshot, 'restoreWorkday');
  syncTrackedMilesFromAuthoritative(4.52, 'restoreWorkday');
  assert.equal(getState().trackedMiles, 4.52);

  syncTrackedMilesFromAuthoritative(4.521, 'setTrackedMiles');
  assert.equal(
    getState().trackedMiles,
    4.52,
    'sub-cent mileage deltas should not churn coordinator state',
  );

  syncTrackedMilesFromAuthoritative(4.63, 'setTrackedMiles');
  assert.equal(getState().trackedMiles, 4.63);

  const checkedInVisits: StoreVisit[] = visits.map((visit) =>
    visit.id === 'visit-2'
      ? {
          ...visit,
          status: 'checked_in',
          checkedInAt: 1_700_000_000_000,
        }
      : visit,
  );

  const checkInSnapshot = buildCoordinatorSnapshotFromVisits({
    activeWorkdayId: 'trip-1',
    trackedMiles: 4.63,
    visits: checkedInVisits,
    pendingAdvancement: null,
    completionPhase: 'idle',
    currentStoreName: 'Harbor Market',
  });

  __applyCoordinatorSnapshotForTests(checkInSnapshot, 'checkIn');
  assert.equal(getState().phase, 'checkedIn');
  assert.equal(
    getState().visitStartedAt,
    new Date(1_700_000_000_000).toISOString(),
    'check-in uses the persisted visit timestamp',
  );

  const completedVisits: StoreVisit[] = checkedInVisits.map((visit) =>
    visit.id === 'visit-2'
      ? {
          ...visit,
          status: 'completed',
          completedAt: 1_700_000_600_000,
        }
      : visit,
  );

  const pending: PendingVisitAdvancement = {
    scheduledDate: '2026-07-17',
    completedVisitId: 'visit-2',
    completedStoreId: 'store-2',
    completedStoreName: 'Harbor Market',
    nextVisitId: 'visit-3',
    nextStoreId: 'store-3',
    nextStoreName: 'River Plaza',
    afterCompletionMode: 'open_directions',
    snapshot: {
      completedVisitId: 'visit-2',
      completedVisitState: {
        status: 'checked_in',
        checkedInAt: 1_700_000_000_000,
      },
      promotedVisitId: 'visit-3',
      promotedVisitState: {
        status: 'pending',
      },
    },
  };

  const completionSnapshot = buildCoordinatorSnapshotFromVisits({
    activeWorkdayId: 'trip-1',
    trackedMiles: 4.63,
    visits: completedVisits,
    pendingAdvancement: pending,
    completionPhase: 'countdown',
    currentStoreName: 'Harbor Market',
  });

  __applyCoordinatorSnapshotForTests(completionSnapshot, 'completeVisit');
  assert.equal(getState().phase, 'completingVisit');
  assert.equal(getState().completedStopCount, 2);
  assert.equal(getState().visitStartedAt, null);

  __applyCoordinatorSnapshotForTests(completionSnapshot, 'completeVisit');
  assert.equal(
    getState().completedStopCount,
    2,
    're-applying completion snapshot must not double-increment progress',
  );

  const undoSnapshot = buildCoordinatorSnapshotFromVisits({
    activeWorkdayId: 'trip-1',
    trackedMiles: 4.63,
    visits: checkedInVisits,
    pendingAdvancement: null,
    completionPhase: 'idle',
    currentStoreName: 'Harbor Market',
  });

  __applyCoordinatorSnapshotForTests(undoSnapshot, 'undoCompletion');
  assert.equal(getState().phase, 'checkedIn');
  assert.equal(getState().completedStopCount, 1);
  assert.equal(getState().currentStopIndex, 2);
  assert.equal(getState().visitStartedAt, new Date(1_700_000_000_000).toISOString());

  const promotedVisits: StoreVisit[] = completedVisits.map((visit) =>
    visit.id === 'visit-3'
      ? {
          ...visit,
          status: 'current',
        }
      : visit,
  );

  const advancedSnapshot = buildCoordinatorSnapshotFromVisits({
    activeWorkdayId: 'trip-1',
    trackedMiles: 4.63,
    visits: promotedVisits,
    pendingAdvancement: null,
    completionPhase: 'idle',
    currentStoreName: 'River Plaza',
  });

  __applyCoordinatorSnapshotForTests(advancedSnapshot, 'advanceToNextStore');
  assert.equal(getState().phase, 'driving');
  assert.equal(getState().currentStoreId, 'store-3');
  assert.equal(getState().currentStopIndex, 3);

  const pendingCurrent = resolveCoordinatorCurrentVisit(completedVisits, pending);
  assert.equal(pendingCurrent?.id, 'visit-2');

  __applyCoordinatorSnapshotForTests(advancedSnapshot, 'advanceToNextStore');
  assert.equal(getState().phase, 'driving');
  assert.equal(getState().activeWorkdayId, 'trip-1');
  assert.equal(
    getState().phase,
    'driving',
    'failed end preserves last valid coordinator state when reset is not invoked',
  );

  onWorkdayEndedSuccess();
  assert.equal(getState().phase, 'idle');
  assert.equal(getState().activeWorkdayId, null);

  console.log('workdayCoordinator integration tests passed');
}

runTests();
