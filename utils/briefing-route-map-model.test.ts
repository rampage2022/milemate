/**
 * Run with: npx tsx utils/briefing-route-map-model.test.ts
 */

import assert from 'node:assert/strict';

import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { buildBriefingRouteMapModel } from '@/utils/briefing-route-map-model';

function createDraft(
  overrides: Partial<RoutePlanningDraft> = {},
): RoutePlanningDraft {
  return {
    dateKey: '2026-07-19',
    phase: 'briefing',
    returnToStart: false,
    startLocation: {
      id: 'start-1',
      formattedAddress: '100 Start St',
      latitude: 32.0,
      longitude: -96.0,
      source: 'manual',
    },
    endLocation: {
      id: 'end-1',
      formattedAddress: '200 End Ave',
      latitude: 32.2,
      longitude: -96.2,
      source: 'manual',
    },
    estimate: {
      distanceMiles: 10,
      driveTimeMinutes: 30,
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
    name: 'Store One',
    addressLine1: '1 Main',
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
  const model = buildBriefingRouteMapModel({
    draft: createDraft(),
    visits: [
      createVisit({ id: 'v1', storeId: 's1', routeOrder: 1 }),
      createVisit({ id: 'v2', storeId: 's2', routeOrder: 2 }),
    ],
    storesById: {
      s1: createStore({ id: 's1', latitude: 32.05, longitude: -96.05 }),
      s2: createStore({ id: 's2', latitude: 32.1, longitude: -96.1 }),
    },
  });

  assert.ok(model);
  assert.equal(model!.markers.length, 4);
  assert.equal(model!.markers[0]?.kind, 'start');
  assert.equal(model!.markers[1]?.kind, 'stop');
  assert.equal(model!.markers[1]?.storeId, 's1');
  assert.equal(model!.markers[2]?.stopNumber, 2);
  assert.equal(model!.markers[3]?.kind, 'finish');
  assert.equal(model!.polyline.length, 4);
}

{
  const startEnd = {
    id: 'home',
    formattedAddress: '100 Start St',
    latitude: 32.0,
    longitude: -96.0,
    source: 'manual' as const,
  };
  const model = buildBriefingRouteMapModel({
    draft: createDraft({
      returnToStart: true,
      startLocation: startEnd,
      endLocation: {
        id: 'other',
        formattedAddress: '200 End Ave',
        latitude: 32.2,
        longitude: -96.2,
        source: 'manual',
      },
    }),
    visits: [],
    storesById: {},
  });

  assert.ok(model);
  assert.equal(model!.markers.length, 1);
  assert.equal(model!.markers[0]?.kind, 'start');
  assert.deepEqual(model!.polyline[0], { latitude: 32.0, longitude: -96.0 });
  assert.deepEqual(model!.polyline[model!.polyline.length - 1], {
    latitude: 32.0,
    longitude: -96.0,
  });
}

{
  const shared = {
    id: 'home',
    formattedAddress: '100 Start St',
    latitude: 32.0,
    longitude: -96.0,
    source: 'manual' as const,
  };
  const model = buildBriefingRouteMapModel({
    draft: createDraft({
      returnToStart: false,
      startLocation: shared,
      endLocation: { ...shared, id: 'finish-copy' },
    }),
    visits: [],
    storesById: {},
  });

  assert.ok(model);
  assert.equal(model!.markers.length, 1);
  assert.equal(model!.markers[0]?.kind, 'start');
}

{
  const curved = [
    { latitude: 32.0, longitude: -96.0 },
    { latitude: 32.05, longitude: -96.02 },
    { latitude: 32.1, longitude: -96.05 },
  ];
  const model = buildBriefingRouteMapModel({
    draft: createDraft({ drivingPolyline: curved }),
    visits: [createVisit()],
    storesById: { 'store-1': createStore() },
  });

  assert.ok(model);
  assert.equal(model!.polyline.length, 3);
  assert.deepEqual(model!.polyline, curved);
}

console.log('briefing-route-map-model.test.ts: all tests passed');
