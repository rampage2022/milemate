/**
 * Tests for route endpoint location resolution.
 *
 * Run with: npx tsx services/route-endpoint-resolver.test.ts
 */

import assert from 'node:assert/strict';

import {
  __setLocationFixProviderForTests,
  resolveRouteEndpointCoordinates,
} from './route-endpoint-resolver';
import {
  createCustomAddressEndpoint,
  createCurrentLocationEndpoint,
} from '../types/route-endpoint';

async function runTests(): Promise<void> {
  __setLocationFixProviderForTests(async () => ({
    ok: true,
    update: {
      latitude: 39.7817,
      longitude: -89.6501,
      accuracy: 10,
      speed: null,
      timestamp: Date.now(),
    },
    fromCache: false,
  }));

  const startResolution = await resolveRouteEndpointCoordinates(
    createCurrentLocationEndpoint(),
  );

  assert.equal(startResolution.status, 'resolved');

  const addressResolution = await resolveRouteEndpointCoordinates(
    createCustomAddressEndpoint({
      label: 'Home',
      address: '123 Main St',
      latitude: 40.1,
      longitude: -88.2,
    }),
  );

  assert.equal(addressResolution.status, 'address_coordinates');

  const addressWithoutCoords = await resolveRouteEndpointCoordinates(
    createCustomAddressEndpoint({
      label: 'Home',
      address: '123 Main St',
    }),
  );

  assert.equal(addressWithoutCoords.status, 'address_without_coordinates');

  __setLocationFixProviderForTests(async () => ({
    ok: false,
    reason: 'permission_denied',
  }));

  const denied = await resolveRouteEndpointCoordinates(
    createCurrentLocationEndpoint(),
  );

  assert.equal(denied.status, 'permission_denied');

  __setLocationFixProviderForTests(null);

  console.log('route-endpoint-resolver tests passed');
}

void runTests();
