/**
 * Run with: npx tsx utils/coordinator-screen-presentation.test.ts
 */

import assert from 'node:assert/strict';

import {
  formatVisitCompletionTime,
  shouldShowLiveRouteSummary,
  shouldShowPlanningRouteDock,
} from './coordinator-screen-presentation';
import {
  buildLiveRouteSummaryData,
  resolveLiveStopPresentationState,
} from './live-route-summary';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

function createVisit(overrides: Partial<StoreVisit> = {}): StoreVisit {
  return {
    id: 'visit-1',
    storeId: 'store-1',
    scheduledDate: '2026-07-18',
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
    name: 'Tom Thumb',
    addressLine1: '410 Oak Street',
    city: 'Dallas',
    state: 'TX',
    postalCode: '75001',
    latitude: 32.8,
    longitude: -96.8,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function runTests() {
  assert.equal(
    shouldShowPlanningRouteDock({
      screenMode: 'planning',
      hasStops: true,
      isCalculatingRoute: false,
      isAddressEntryActive: false,
      isKeyboardVisible: false,
    }),
    true,
  );

  assert.equal(
    shouldShowPlanningRouteDock({
      screenMode: 'planning',
      hasStops: true,
      isCalculatingRoute: true,
      isAddressEntryActive: false,
      isKeyboardVisible: false,
    }),
    false,
  );

  assert.equal(shouldShowLiveRouteSummary('active_workday'), true);
  assert.equal(shouldShowLiveRouteSummary('planning'), false);
  assert.equal(shouldShowLiveRouteSummary('calculating'), false);

  assert.equal(formatVisitCompletionTime(undefined), null);
  assert.equal(formatVisitCompletionTime(Number.NaN), null);
  assert.equal(
    formatVisitCompletionTime(new Date('2026-07-18T09:15:00').getTime())?.includes('9:15'),
    true,
  );

  assert.equal(
    resolveLiveStopPresentationState({
      currentVisitId: 'visit-2',
      visit: createVisit({ id: 'visit-1', status: 'completed' }),
    }),
    'completed',
  );

  assert.equal(
    resolveLiveStopPresentationState({
      currentVisitId: 'visit-2',
      visit: createVisit({ id: 'visit-2', status: 'current' }),
    }),
    'current',
  );

  assert.equal(
    resolveLiveStopPresentationState({
      currentVisitId: 'visit-2',
      visit: createVisit({ id: 'visit-3', status: 'pending' }),
    }),
    'upcoming',
  );

  assert.equal(
    resolveLiveStopPresentationState({
      currentVisitId: 'visit-2',
      visit: createVisit({ id: 'visit-4', status: 'skipped' }),
    }),
    'skipped',
  );

  const liveSummary = buildLiveRouteSummaryData({
    current: {
      visit: createVisit({ id: 'visit-2', routeOrder: 2, status: 'current' }),
      store: createStore({ id: 'store-2', name: '4788 N Josey Ln', addressLine1: '4788 N Josey Ln' }),
    },
    estimatedFinishAt: '2026-07-18T16:32:00.000Z',
    next: {
      visit: createVisit({ id: 'visit-3', routeOrder: 3, status: 'pending' }),
      store: createStore({
        id: 'store-3',
        name: '2501 Midway Rd',
        addressLine1: '2501 Midway Rd',
        latitude: 32.81,
        longitude: -96.81,
      }),
    },
    totalCount: 4,
    visits: [
      createVisit({ id: 'visit-1', routeOrder: 1, status: 'completed' }),
      createVisit({ id: 'visit-2', routeOrder: 2, status: 'current' }),
      createVisit({ id: 'visit-3', routeOrder: 3, status: 'pending' }),
      createVisit({ id: 'visit-4', routeOrder: 4, status: 'pending' }),
    ],
  });

  assert.equal(liveSummary.progress.label, 'Progress');
  assert.equal(liveSummary.progress.ringValue, '2/4');
  assert.equal(liveSummary.progress.primaryValue, '2 of 4');
  assert.equal(liveSummary.progress.supportingValue, '');
  assert.equal(liveSummary.progress.indicator.totalStops, 4);
  assert.equal(liveSummary.progress.indicator.completedStops, 1);
  assert.equal(liveSummary.progress.indicator.currentStopIndex, 1);
  assert.equal(
    liveSummary.progress.indicator.accessibilityLabel,
    'Route progress, 2 of 4 stops, 1 completed, stop 2 current.',
  );
  assert.equal(liveSummary.nextStop.label, 'Next Stop');
  assert.equal(liveSummary.nextStop.primaryValue, '2501 Midway Rd');
  assert.match(liveSummary.nextStop.supportingValue, /min/);
  assert.equal(liveSummary.finishEta.label, 'Estimated Completion');
  assert.equal(liveSummary.finishEta.supportingValue, '');
  assert.notEqual(liveSummary.finishEta.primaryValue, '—');

  const missingFinishEta = buildLiveRouteSummaryData({
    current: {
      visit: createVisit({ id: 'visit-1', routeOrder: 1, status: 'current' }),
      store: createStore(),
    },
    next: null,
    totalCount: 1,
    visits: [createVisit({ id: 'visit-1', routeOrder: 1, status: 'current' })],
  });

  assert.equal(missingFinishEta.finishEta.primaryValue, '—');

  const completedRoute = buildLiveRouteSummaryData({
    current: null,
    next: null,
    totalCount: 2,
    visits: [
      createVisit({ id: 'visit-1', routeOrder: 1, status: 'completed' }),
      createVisit({ id: 'visit-2', routeOrder: 2, status: 'completed' }),
    ],
  });

  assert.equal(completedRoute.nextStop.primaryValue, 'Route complete');
  assert.equal(completedRoute.progress.indicator.completedStops, 2);
  assert.equal(completedRoute.progress.indicator.currentStopIndex, null);
  assert.equal(
    completedRoute.progress.indicator.accessibilityLabel,
    'Route progress, 2 of 2 stops, 2 completed.',
  );

  assert.equal(
    shouldShowPlanningRouteDock({
      screenMode: 'planning',
      hasStops: true,
      isCalculatingRoute: false,
      isAddressEntryActive: false,
      isKeyboardVisible: false,
    }),
    true,
    'route calculation failure returns to planning dock',
  );

  assert.equal(
    shouldShowLiveRouteSummary('briefing'),
    false,
    'briefing should not show live summary',
  );

  console.log('coordinator-screen-presentation tests passed');
}

runTests();
