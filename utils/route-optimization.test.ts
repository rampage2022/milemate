/**
 * Tests for utils/route-optimization.ts
 *
 * Run with: npx tsx utils/route-optimization.test.ts
 */

import assert from 'node:assert/strict';

import type { RouteLocation } from '../types/route-location';
import {
  buildPlannedRouteEstimate,
  calculatePlannedRouteDistanceMiles,
  optimizeStopOrder,
} from './route-optimization';

function location(id: string, lat: number, lng: number): RouteLocation {
  return {
    id,
    formattedAddress: `${id} address`,
    latitude: lat,
    longitude: lng,
    source: 'manual',
  };
}

function runTests(): void {
  const start = location('start', 33.0, -97.0);
  const end = location('end', 33.1, -97.1);
  const stops = [
    { visitId: 'v1', storeId: 's1', latitude: 33.05, longitude: -97.05 },
    { visitId: 'v2', storeId: 's2', latitude: 33.02, longitude: -97.08 },
  ];

  const ordered = optimizeStopOrder({ start, end, stops });
  assert.equal(ordered.length, 2);

  const estimate = buildPlannedRouteEstimate({
    start,
    end,
    orderedStops: ordered,
  });

  assert.equal(estimate.method, 'direct-segment-sum');
  assert.ok(estimate.distanceMiles > 0);
  assert.ok(estimate.driveTimeMinutes > 0);

  const distance = calculatePlannedRouteDistanceMiles({
    start,
    end,
    orderedStops: ordered,
  });

  assert.ok(distance > 0);

  console.log('route-optimization tests passed');
}

runTests();
