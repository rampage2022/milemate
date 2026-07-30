/**
 * Tests for utils/route-briefing.ts
 *
 * Run with: npx tsx utils/route-briefing.test.ts
 */

import assert from 'node:assert/strict';

import {
  createCurrentLocationEndpoint,
  createCustomAddressEndpoint,
  createSavedLocationEndpoint,
} from '../types/route-endpoint';
import { createEmptyTodayRouteSelection } from '../types/today-route-selection';
import type { SavedLocation } from '../types/saved-location';
import type { StoreVisit } from '../types/store-visit';
import { buildAdaptiveRouteBriefing } from './route-briefing';
import {
  updateTodayRouteEnd,
  updateTodayRouteStart,
} from './today-route-selection';
import { deriveRouteEstimateStatus } from './route-estimate';

function createVisit(
  overrides: Partial<StoreVisit> & Pick<StoreVisit, 'id' | 'storeId' | 'routeOrder' | 'status'>,
): StoreVisit {
  return {
    scheduledDate: '2026-07-21',
    notes: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function runTests(): void {
  const homeSaved: SavedLocation = {
    id: 'loc-home',
    label: 'Home',
    address: '123 Main St',
    latitude: null,
    longitude: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const visits = [
    createVisit({
      id: 'v1',
      storeId: 'store-a',
      routeOrder: 1,
      status: 'pending',
    }),
  ];

  const storesById = {
    'store-a': {
      id: 'store-a',
      name: 'Tom Thumb',
      addressLine1: '1 Main',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      createdAt: 1,
      updatedAt: 1,
    },
  };

  const noneSelected = buildAdaptiveRouteBriefing({
    selection: createEmptyTodayRouteSelection('2026-07-21'),
    locations: [],
    stopCount: 1,
    visits,
    storesById,
  });

  assert.equal(noneSelected.routeSummary, null);
  assert.equal(noneSelected.isRouteComplete, false);

  const startOnlyIncomplete = buildAdaptiveRouteBriefing({
    selection: {
      ...createEmptyTodayRouteSelection('2026-07-21'),
      returnToStart: false,
      endEndpoint: null,
      startEndpoint: createCurrentLocationEndpoint(),
    },
    locations: [],
    stopCount: 1,
    visits,
    storesById,
  });

  assert.equal(startOnlyIncomplete.routeSummary, null);

  const startOnlyComplete = buildAdaptiveRouteBriefing({
    selection: updateTodayRouteStart(
      createEmptyTodayRouteSelection('2026-07-21'),
      createCurrentLocationEndpoint(),
    ),
    locations: [],
    stopCount: 1,
    visits,
    storesById,
  });

  assert.equal(startOnlyComplete.routeSummary?.startLabel, 'Current Location');

  const completeSaved = buildAdaptiveRouteBriefing({
    selection: updateTodayRouteEnd(
      updateTodayRouteStart(
        createEmptyTodayRouteSelection('2026-07-21'),
        createSavedLocationEndpoint('loc-home'),
      ),
      createSavedLocationEndpoint('loc-home'),
    ),
    locations: [homeSaved],
    stopCount: 1,
    visits,
    storesById,
  });

  assert.equal(completeSaved.routeSummary?.startLabel, 'Home');
  assert.equal(completeSaved.routeSummary?.endLabel, 'Home');

  const currentToHome = buildAdaptiveRouteBriefing({
    selection: {
      ...updateTodayRouteStart(
        createEmptyTodayRouteSelection('2026-07-21'),
        createCurrentLocationEndpoint(),
      ),
      returnToStart: false,
      endEndpoint: createSavedLocationEndpoint('loc-home'),
    },
    locations: [homeSaved],
    stopCount: 1,
    visits,
    storesById,
  });

  assert.equal(currentToHome.routeSummary?.startLabel, 'Current Location');
  assert.equal(currentToHome.routeSummary?.endLabel, 'Home');

  const customAddress = buildAdaptiveRouteBriefing({
    selection: updateTodayRouteStart(
      createEmptyTodayRouteSelection('2026-07-21'),
      createCustomAddressEndpoint({ label: 'Client', address: '789 Oak Ave' }),
    ),
    locations: [],
    stopCount: 1,
    visits,
    storesById,
  });

  assert.equal(customAddress.startLabel, 'Client');

  const deletedReference = buildAdaptiveRouteBriefing({
    selection: updateTodayRouteStart(
      createEmptyTodayRouteSelection('2026-07-21'),
      createSavedLocationEndpoint('deleted-id'),
    ),
    locations: [],
    stopCount: 1,
    visits,
    storesById,
  });

  assert.equal(deletedReference.routeSummary, null);
  assert.equal(deletedReference.startLabel, null);

  const estimateReady = deriveRouteEstimateStatus(
    {
      ...createEmptyTodayRouteSelection('2026-07-21'),
      startEndpoint: createCurrentLocationEndpoint(),
      returnToStart: true,
    },
    [homeSaved],
  );
  assert.equal(estimateReady.status, 'ready');

  const estimateIncomplete = deriveRouteEstimateStatus(
    createEmptyTodayRouteSelection('2026-07-21'),
    [],
  );
  assert.equal(estimateIncomplete.status, 'incomplete');

  console.log('route-briefing tests passed');
}

runTests();
