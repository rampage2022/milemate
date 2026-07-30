/**
 * Run with: npx tsx services/route-planning-readiness.test.ts
 */

import assert from 'node:assert/strict';

import { isRoutePlanningReadyToCalculate } from '@/services/route-planning';
import type { RoutePlanningDraft } from '@/types/route-planning';

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
    estimate: null,
    calculatedAt: null,
    updatedAt: '2026-07-19T08:00:00.000Z',
    drivingPolyline: null,
    ...overrides,
  };
}

function runTests() {
  const draft = createDraft();

  assert.equal(
    isRoutePlanningReadyToCalculate(draft, {
      totalStopCount: 2,
      verifiedStopCount: 2,
    }),
    true,
  );

  assert.equal(
    isRoutePlanningReadyToCalculate(draft, {
      totalStopCount: 2,
      verifiedStopCount: 1,
    }),
    false,
    'partially geocoded routes should stay disabled',
  );

  assert.equal(
    isRoutePlanningReadyToCalculate(createDraft({ startLocation: null }), {
      totalStopCount: 1,
      verifiedStopCount: 1,
    }),
    false,
    'missing start should stay disabled',
  );

  console.log('route-planning-readiness.test.ts: all tests passed');
}

runTests();
