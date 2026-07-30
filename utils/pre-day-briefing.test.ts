/**
 * Tests for utils/pre-day-briefing.ts
 *
 * Run with: npx tsx utils/pre-day-briefing.test.ts
 */

import assert from 'node:assert/strict';

import type { Store } from '../types/store';
import type { StoreVisit } from '../types/store-visit';
import {
  createCurrentLocationEndpoint,
  createSavedLocationEndpoint,
} from '../types/route-endpoint';
import { createEmptyTodayRouteSelection } from '../types/today-route-selection';
import type { SavedLocation } from '../types/saved-location';
import {
  buildPreDayBriefing,
  countFinishedVisits,
  isTodayRouteFullyComplete,
  MAX_BRIEFING_NOTES,
  resolveTodayScreenMode,
} from './pre-day-briefing';
import {
  updateTodayRouteEnd,
  updateTodayRouteStart,
} from './today-route-selection';

function createStore(id: string, name: string): Store {
  const now = Date.now();

  return {
    id,
    name,
    addressLine1: '1 Main St',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701',
    createdAt: now,
    updatedAt: now,
  };
}

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
  const storesById: Record<string, Store> = {
    'store-a': createStore('store-a', 'Tom Thumb'),
    'store-b': createStore('store-b', 'CVS'),
    'store-c': createStore('store-c', 'Harbor Market'),
  };

  const visits: StoreVisit[] = [
    createVisit({
      id: 'visit-1',
      storeId: 'store-a',
      routeOrder: 1,
      status: 'pending',
      notes: [{ id: 'n1', text: '  Delivery expected before noon  ', createdAt: 2 }],
    }),
    createVisit({
      id: 'visit-2',
      storeId: 'store-b',
      routeOrder: 2,
      status: 'pending',
      notes: [{ id: 'n2', text: 'CVS manager requested a photo', createdAt: 3 }],
    }),
    createVisit({
      id: 'visit-3',
      storeId: 'store-c',
      routeOrder: 3,
      status: 'completed',
      notes: [{ id: 'n3', text: 'Delivery expected before noon', createdAt: 4 }],
    }),
  ];

  const homeSaved: SavedLocation = {
    id: 'loc-home',
    label: 'Home',
    address: '123 Main St',
    latitude: null,
    longitude: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const todayRouteSelection = updateTodayRouteEnd(
    updateTodayRouteStart(
      createEmptyTodayRouteSelection('2026-07-21'),
      createCurrentLocationEndpoint(),
    ),
    createSavedLocationEndpoint('loc-home'),
  );

  const briefing = buildPreDayBriefing(
    visits,
    storesById,
    { ...todayRouteSelection, returnToStart: false },
    [homeSaved],
  );

  assert.equal(briefing.totalStops, 3);
  assert.equal(briefing.route.routeSummary?.startLabel, 'Current Location');
  assert.equal(briefing.route.routeSummary?.endLabel, 'Home');
  assert.equal(briefing.route.firstStop?.storeName, 'Tom Thumb');
  assert.equal(briefing.importantNotes.length, 2, 'duplicate notes removed');

  const incompleteBriefing = buildPreDayBriefing(
    visits,
    storesById,
    createEmptyTodayRouteSelection('2026-07-21'),
    [],
  );

  assert.equal(incompleteBriefing.route.routeSummary, null);

  const manyNotesVisits: StoreVisit[] = Array.from({ length: 5 }, (_, index) =>
    createVisit({
      id: `visit-${index + 1}`,
      storeId: 'store-a',
      routeOrder: index + 1,
      status: 'pending',
      notes: [{ id: `note-${index}`, text: `Note ${index + 1}`, createdAt: index }],
    }),
  );

  const limitedBriefing = buildPreDayBriefing(
    manyNotesVisits,
    storesById,
    { ...todayRouteSelection, returnToStart: false },
    [homeSaved],
  );
  assert.equal(limitedBriefing.importantNotes.length, MAX_BRIEFING_NOTES);

  const completedVisits: StoreVisit[] = [
    createVisit({ id: 'v1', storeId: 'store-a', routeOrder: 1, status: 'completed' }),
    createVisit({ id: 'v2', storeId: 'store-b', routeOrder: 2, status: 'completed' }),
  ];

  assert.equal(isTodayRouteFullyComplete(completedVisits), true);
  assert.equal(
    resolveTodayScreenMode({
      isRestoring: false,
      isLoading: false,
      isWorkdayActive: false,
      visits: completedVisits,
    }),
    'completed_day',
  );

  console.log('pre-day-briefing tests passed');
}

runTests();
