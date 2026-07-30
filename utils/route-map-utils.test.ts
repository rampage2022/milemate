/**
 * Run with: npx tsx utils/route-map-utils.test.ts
 */

import assert from 'node:assert/strict';

import {
  computeRouteGeometryKey,
  computeRouteMapInitialRegion,
  isCoordinateInsideMapBounds,
  nudgeRegionToIncludeCoordinate,
} from '@/utils/route-map-utils';

function testGeometryKeyStable() {
  const left = [
    { latitude: 33.123456789, longitude: -97.987654321 },
    { latitude: 33.2, longitude: -97.9 },
  ];
  const right = [
    { latitude: 33.12346, longitude: -97.98765 },
    { latitude: 33.2, longitude: -97.9 },
  ];

  assert.equal(computeRouteGeometryKey(left), computeRouteGeometryKey(right));
}

function testNudgePreservesZoom() {
  const region = {
    latitude: 33,
    longitude: -97,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  };
  const point = { latitude: 33, longitude: -96.5 };

  const nudged = nudgeRegionToIncludeCoordinate(region, point);

  assert.equal(nudged.latitudeDelta, region.latitudeDelta);
  assert.equal(nudged.longitudeDelta, region.longitudeDelta);
  assert.ok(nudged.longitude > region.longitude);
}

function testBoundsInset() {
  const bounds = {
    northEast: { latitude: 34, longitude: -96 },
    southWest: { latitude: 33, longitude: -97 },
  };

  assert.equal(
    isCoordinateInsideMapBounds({ latitude: 33.5, longitude: -96.5 }, bounds),
    true,
  );
  assert.equal(
    isCoordinateInsideMapBounds({ latitude: 33.999, longitude: -96.001 }, bounds),
    false,
  );
}

function testPlanningOverviewMinimumZoom() {
  const singlePoint = [{ latitude: 32.87, longitude: -96.94 }];
  const region = computeRouteMapInitialRegion(singlePoint, { planningOverview: true });

  assert.ok(region.latitudeDelta >= 0.12);
  assert.ok(region.longitudeDelta >= 0.12);
}

testGeometryKeyStable();
testNudgePreservesZoom();
testBoundsInset();
testPlanningOverviewMinimumZoom();

console.log('route-map-utils.test.ts: ok');
