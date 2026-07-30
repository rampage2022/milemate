/**
 * Run with: npx tsx utils/briefing-presentation.test.ts
 */

import assert from 'node:assert/strict';

import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { buildBriefingPresentation } from '@/utils/briefing-presentation';
import type { DailyBriefingSummary } from '@/utils/planned-route-briefing';

const summary: DailyBriefingSummary = {
  dateHeading: 'Sunday, July 19, 2026',
  startLabel: 'Home',
  startAddress: '100 Home Rd',
  endLabel: 'Home',
  endAddress: '100 Home Rd',
  stopCount: 2,
  estimatedDistanceLabel: '12.0 mi',
  estimatedDriveTimeLabel: '1 hr',
  estimatedFinishLabel: '3:29 PM',
  firstStopName: 'Riverbend Market',
  lastStopName: 'Last Store',
  estimateMethodNote: 'unused in UI',
};

function createDraft(
  overrides: Partial<RoutePlanningDraft> = {},
): RoutePlanningDraft {
  return {
    dateKey: '2026-07-19',
    phase: 'briefing',
    returnToStart: true,
    startLocation: {
      id: 'start-1',
      formattedAddress: '100 Home Rd',
      latitude: 32.0,
      longitude: -96.0,
      source: 'manual',
    },
    endLocation: null,
    estimate: {
      distanceMiles: 12,
      driveTimeMinutes: 60,
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
    name: 'Riverbend Market',
    addressLine1: '1 Market',
    city: 'Dallas',
    state: 'TX',
    postalCode: '75001',
    latitude: 32.05,
    longitude: -96.05,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

{
  const presentation = buildBriefingPresentation({
    draft: createDraft(),
    visits: [
      createVisit({ id: 'v1', storeId: 's1', routeOrder: 1 }),
      createVisit({ id: 'v2', storeId: 's2', routeOrder: 2 }),
    ],
    storesById: {
      s1: createStore({ id: 's1', name: 'Riverbend Market' }),
      s2: createStore({ id: 's2', name: 'Other', latitude: 32.1, longitude: -96.1 }),
    },
    summary,
  });

  assert.equal(presentation.endpointsAreSame, true);
  assert.equal(presentation.routeHealth?.status, 'verified');
  assert.ok(presentation.routeMap);
  assert.ok(presentation.firstStopDriveTimeLabel);
}

{
  const presentation = buildBriefingPresentation({
    draft: createDraft({ returnToStart: false }),
    visits: [createVisit({ storeId: 's1' })],
    storesById: {
      s1: createStore({ id: 's1', latitude: undefined, longitude: undefined }),
    },
    summary: { ...summary, stopCount: 1 },
  });

  assert.equal(presentation.routeHealth?.status, 'needs_review');
  assert.equal(
    presentation.routeHealth?.status === 'needs_review'
      ? presentation.routeHealth.count
      : null,
    1,
  );
}

console.log('briefing-presentation.test.ts: all tests passed');
