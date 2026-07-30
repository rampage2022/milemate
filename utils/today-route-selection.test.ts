/**
 * Tests for utils/today-route-selection.ts and route endpoint helpers
 *
 * Run with: npx tsx utils/today-route-selection.test.ts
 */

import assert from 'node:assert/strict';

import {
  createCurrentLocationEndpoint,
  createCustomAddressEndpoint,
  createSavedLocationEndpoint,
} from '../types/route-endpoint';
import { createEmptyTodayRouteSelection } from '../types/today-route-selection';
import {
  applyReturnToStartToggle,
  sanitizeTodayRouteSelection,
  updateTodayRouteEnd,
  updateTodayRouteStart,
} from './today-route-selection';
import { getEffectiveEndEndpoint, serializeRouteEndpointForStorage } from './route-endpoints';

function runTests(): void {
  const today = '2026-07-21';
  const yesterday = '2026-07-20';

  const empty = createEmptyTodayRouteSelection(today);
  assert.equal(empty.returnToStart, true);
  assert.equal(empty.startEndpoint, null);

  const yesterdaySelection = sanitizeTodayRouteSelection(
    {
      dateKey: yesterday,
      startEndpoint: createCurrentLocationEndpoint(),
      endEndpoint: null,
      returnToStart: true,
    },
    today,
  );

  assert.equal(yesterdaySelection.dateKey, today);
  assert.equal(yesterdaySelection.startEndpoint, null);

  const currentStart = updateTodayRouteStart(
    empty,
    createCurrentLocationEndpoint(),
  );
  assert.equal(currentStart.startEndpoint?.type, 'current_location');

  const savedEnd = updateTodayRouteEnd(
    currentStart,
    createSavedLocationEndpoint('loc-home'),
  );

  const returnToStart = applyReturnToStartToggle(savedEnd, true);
  assert.deepEqual(getEffectiveEndEndpoint(returnToStart), returnToStart.startEndpoint);

  const separateEnd = applyReturnToStartToggle(savedEnd, false);
  assert.deepEqual(getEffectiveEndEndpoint(separateEnd), separateEnd.endEndpoint);

  const toggledBack = applyReturnToStartToggle(separateEnd, true);
  assert.deepEqual(toggledBack.endEndpoint, savedEnd.endEndpoint);

  const serialized = serializeRouteEndpointForStorage(createCurrentLocationEndpoint());
  assert.deepEqual(serialized, createCurrentLocationEndpoint());
  assert.equal('latitude' in serialized, false);

  const deletedSavedReference = sanitizeTodayRouteSelection(
    {
      dateKey: today,
      startEndpoint: createSavedLocationEndpoint('missing-id'),
      endEndpoint: null,
      returnToStart: true,
    },
    today,
  );

  assert.equal(deletedSavedReference.startEndpoint?.type, 'saved_location');

  const legacy = sanitizeTodayRouteSelection(
    {
      scheduledDate: today,
      startLocation: {
        type: 'address',
        label: 'Home',
        address: '123 Main',
        latitude: null,
        longitude: null,
      },
      startAndEndSameLocation: false,
    },
    today,
  );

  assert.equal(legacy.startEndpoint?.type, 'custom_address');

  console.log('today-route-selection tests passed');
}

runTests();
