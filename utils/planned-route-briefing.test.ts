/**
 * Run with: npx tsx utils/planned-route-briefing.test.ts
 */

import assert from 'node:assert/strict';

import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { buildPlanningPreviewEstimate } from '@/utils/planned-route-briefing';

function createDraft(
  overrides: Partial<RoutePlanningDraft> = {},
): RoutePlanningDraft {
  return {
    dateKey: '2026-07-19',
    phase: 'planning',
    startLocation: {
      id: 'start-1',
      name: 'Home',
      formattedAddress: '1 Main St\nSpringfield, IL 62704',
      latitude: 39.78,
      longitude: -89.65,
      source: 'manual',
    },
    endLocation: null,
    returnToStart: true,
    estimate: {
      distanceMiles: 99.9,
      driveTimeMinutes: 120,
      estimatedFinishAt: '2026-07-19T18:00:00.000Z',
      method: 'direct-segment-sum',
    },
    calculatedAt: '2026-07-19T08:00:00.000Z',
    updatedAt: '2026-07-19T08:00:00.000Z',
    drivingPolyline: null,
    ...overrides,
  };
}

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

function createStore(overrides: Partial<Store> = {}): Store {
  return {
    id: 'store-1',
    name: 'Westside Grocery',
    addressLine1: '410 Oak Street',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62704',
    latitude: 39.7817,
    longitude: -89.6501,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function runTests() {
  const draft = createDraft();
  const visits = [createVisit()];
  const storesById = { 'store-1': createStore() };

  const planningPreview = buildPlanningPreviewEstimate({
    draft,
    visits,
    storesById,
  });

  assert.notEqual(planningPreview?.distanceMiles, 99.9, 'planning phase should recompute preview');

  const briefingPreview = buildPlanningPreviewEstimate({
    draft: createDraft({ phase: 'briefing' }),
    visits,
    storesById,
  });

  assert.equal(briefingPreview?.distanceMiles, 99.9, 'briefing phase should use saved estimate');

  console.log('planned-route-briefing.test.ts: all tests passed');
}

runTests();
