/**
 * Run with: npx tsx utils/route-complete-summary.test.ts
 */

import assert from 'node:assert/strict';

import type { RouteCompleteRecord } from '@/types/route-complete-record';
import type { StoreVisit } from '@/types/store-visit';
import { buildRouteCompleteSummaryPresentationFromRecord } from '@/utils/route-complete-summary';

function visit(status: StoreVisit['status'], routeOrder: number): StoreVisit {
  return {
    id: `visit-${routeOrder}`,
    storeId: `store-${routeOrder}`,
    scheduledDate: '2026-07-22',
    routeOrder,
    status,
    notes: [],
    createdAt: 1,
    updatedAt: 1,
    visitDurationMs: status === 'completed' ? 60_000 : undefined,
    completedAt: status === 'completed' ? 1_000 : undefined,
  };
}

function record(overrides: Partial<RouteCompleteRecord> = {}): RouteCompleteRecord {
  return {
    activeWorkdayTrip: {
      id: 'trip-1',
      startedAt: 0,
      distanceMiles: 72.4,
    },
    distanceMiles: 72.4,
    endEndpoint: { label: 'End', latitude: 33, longitude: -97 },
    mileageTrackingAvailable: true,
    ordersLoggedCount: 0,
    returnToStart: true,
    routeCompletedAtMs: 3_600_000,
    routeContext: null,
    routeStartedAtMs: 0,
    startEndpoint: { label: 'Start', latitude: 32, longitude: -96 },
    storesById: {},
    visits: [visit('completed', 1), visit('completed', 2)],
    workdayStartedAtMs: 0,
    ...overrides,
  };
}

const completedRoute = buildRouteCompleteSummaryPresentationFromRecord(record());

assert.equal(completedRoute.title, 'Route Complete');
assert.equal(completedRoute.achievement.primaryLine, '2 of 2');
assert.equal(
  completedRoute.metrics.find((metric) => metric.id === 'miles')?.value,
  '72.4 mi',
);

const mixedRoute = buildRouteCompleteSummaryPresentationFromRecord(
  record({
    visits: [visit('completed', 1), visit('completed', 2), visit('skipped', 3)],
  }),
);

assert.equal(mixedRoute.title, 'Route Finished');
assert.equal(mixedRoute.achievement.useOutcomeCounts, true);
assert.equal(mixedRoute.outcomes.completed, 2);
assert.equal(mixedRoute.outcomes.skipped, 1);

const unavailableMiles = buildRouteCompleteSummaryPresentationFromRecord(
  record({
    distanceMiles: null,
    mileageTrackingAvailable: false,
    visits: [visit('completed', 1)],
  }),
);

assert.equal(
  unavailableMiles.metrics.find((metric) => metric.id === 'miles')?.value,
  'Not recorded',
);

const missingRouteDuration = buildRouteCompleteSummaryPresentationFromRecord(
  record({
    routeStartedAtMs: null,
  }),
);

assert.equal(
  missingRouteDuration.metrics.find((metric) => metric.id === 'route-duration')?.value,
  'Not recorded',
);

const averageVisitTime = buildRouteCompleteSummaryPresentationFromRecord(
  record({
    visits: [
      { ...visit('completed', 1), visitDurationMs: 10 * 60_000 },
      { ...visit('completed', 2), visitDurationMs: 20 * 60_000 },
    ],
  }),
);

assert.equal(
  averageVisitTime.metrics.find((metric) => metric.id === 'visit-time')?.label,
  'Average Visit Time',
);
assert.equal(
  averageVisitTime.metrics.find((metric) => metric.id === 'visit-time')?.value,
  '15 min',
);

const averageVisitTimeOneHour = buildRouteCompleteSummaryPresentationFromRecord(
  record({
    visits: [
      { ...visit('completed', 1), visitDurationMs: 45 * 60_000 },
      { ...visit('completed', 2), visitDurationMs: 75 * 60_000 },
    ],
  }),
);

assert.equal(
  averageVisitTimeOneHour.metrics.find((metric) => metric.id === 'visit-time')?.value,
  '1 hr',
);

const averageVisitTimeUnavailable = buildRouteCompleteSummaryPresentationFromRecord(
  record({
    visits: [
      { ...visit('completed', 1), visitDurationMs: undefined },
      visit('skipped', 2),
      { ...visit('completed', 3), visitDurationMs: 0 },
    ],
  }),
);

assert.equal(
  averageVisitTimeUnavailable.metrics.find((metric) => metric.id === 'visit-time')?.value,
  '—',
);

console.log('route-complete-summary.test.ts: ok');
