/**
 * Tests for services/start-day-flow.ts
 *
 * Run with: npx tsx services/start-day-flow.test.ts
 */

import assert from 'node:assert/strict';

import { __setLocationFixProviderForTests } from './route-endpoint-resolver';
import {
  prepareStartDayLocationRequirements,
  validateStartEndpointForStartDay,
} from './start-day-flow';
import {
  createCustomAddressEndpoint,
  createCurrentLocationEndpoint,
} from '../types/route-endpoint';

async function runTests(): Promise<void> {
  const addressStart = await validateStartEndpointForStartDay(
    createCustomAddressEndpoint({
      label: 'Depot',
      address: '100 Warehouse Rd',
    }),
  );

  assert.equal(addressStart.ok, true);

  const prepared = await prepareStartDayLocationRequirements();
  assert.equal(prepared.ok, true, 'incomplete route does not block Start Day');

  __setLocationFixProviderForTests(async () => ({
    ok: false,
    reason: 'permission_denied',
  }));

  const denied = await validateStartEndpointForStartDay(
    createCurrentLocationEndpoint(),
  );

  assert.equal(denied.ok, false);

  if (!denied.ok) {
    assert.equal(denied.reason, 'permission_denied');
  }

  __setLocationFixProviderForTests(async () => ({
    ok: true,
    update: {
      latitude: 39.78,
      longitude: -89.65,
      accuracy: 8,
      speed: null,
      timestamp: Date.now(),
    },
    fromCache: true,
  }));

  const resolved = await validateStartEndpointForStartDay(
    createCurrentLocationEndpoint(),
  );

  assert.equal(resolved.ok, true);

  __setLocationFixProviderForTests(null);

  console.log('start-day-flow tests passed');
}

void runTests();
