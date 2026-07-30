import assert from 'node:assert/strict';
import test from 'node:test';

import type { RoutePlanningDraft } from '@/types/route-planning';
import type { StoreVisit } from '@/types/store-visit';

import {
  getFinishLocation,
  getStartLocation,
  getVisitStops,
  hasVisitStops,
  isBlankRoute,
} from './route-state';

function visit(id: string): StoreVisit {
  return {
    id,
    storeId: `store-${id}`,
    scheduledDate: '2026-07-25',
    routeOrder: 1,
    status: 'pending',
    notes: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

function draft(overrides: Partial<RoutePlanningDraft> = {}): RoutePlanningDraft {
  return {
    dateKey: '2026-07-25',
    phase: 'planning',
    startLocation: null,
    endLocation: null,
    returnToStart: true,
    estimate: null,
    drivingPolyline: null,
    calculatedAt: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test('blank route ignores endpoint configuration', () => {
  assert.equal(isBlankRoute([]), true);
  assert.equal(hasVisitStops([]), false);
  assert.equal(getVisitStops([]).length, 0);

  const withEndpoints = draft({
    startLocation: {
      id: 'start',
      formattedAddress: '1 Main St',
      latitude: 1,
      longitude: 2,
      source: 'profile',
      name: 'Home',
    },
  });

  assert.equal(isBlankRoute([]), true);
  assert.equal(getStartLocation(withEndpoints)?.name, 'Home');
  assert.equal(getFinishLocation(withEndpoints)?.name, 'Home');
});

test('loaded route is defined by visit stops only', () => {
  assert.equal(isBlankRoute([visit('a')]), false);
  assert.equal(hasVisitStops([visit('a')]), true);
});
