/**
 * Integration tests for arrival-aware coordinator phase mapping.
 *
 * Run with: npx tsx core/arrivalCoordinator.integration.test.ts
 */

import assert from 'node:assert/strict';

import { buildCoordinatorSnapshotFromVisits } from '@/core/workdayCoordinatorMapping';
import type { StoreVisit } from '@/types/store-visit';

function createVisit(
  overrides: Partial<StoreVisit> & Pick<StoreVisit, 'id' | 'storeId' | 'routeOrder' | 'status'>,
): StoreVisit {
  return {
    scheduledDate: '2026-07-18',
    notes: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function runTests(): void {
  const visits: StoreVisit[] = [
    createVisit({
      id: 'visit-1',
      storeId: 'store-1',
      routeOrder: 1,
      status: 'current',
    }),
  ];

  const drivingSnapshot = buildCoordinatorSnapshotFromVisits({
    activeWorkdayId: 'trip-1',
    trackedMiles: 1.2,
    visits,
    pendingAdvancement: null,
    completionPhase: 'idle',
    currentStoreName: 'Test Store',
    hasArrived: false,
  });

  assert.equal(drivingSnapshot.phase, 'driving');

  const arrivedSnapshot = buildCoordinatorSnapshotFromVisits({
    activeWorkdayId: 'trip-1',
    trackedMiles: 1.2,
    visits,
    pendingAdvancement: null,
    completionPhase: 'idle',
    currentStoreName: 'Test Store',
    hasArrived: true,
  });

  assert.equal(arrivedSnapshot.phase, 'arrived');

  const checkedInVisits = visits.map((visit) => ({
    ...visit,
    status: 'checked_in' as const,
    checkedInAt: 1_700_000_000_000,
  }));

  const checkedInSnapshot = buildCoordinatorSnapshotFromVisits({
    activeWorkdayId: 'trip-1',
    trackedMiles: 1.2,
    visits: checkedInVisits,
    pendingAdvancement: null,
    completionPhase: 'idle',
    currentStoreName: 'Test Store',
    hasArrived: true,
  });

  assert.equal(
    checkedInSnapshot.phase,
    'checkedIn',
    'checked-in phase must win over arrived',
  );

  console.log('arrival coordinator integration tests passed');
}

runTests();
