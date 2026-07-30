/**
 * Tests for utils/route-endpoints.ts
 *
 * Run with: npx tsx utils/route-endpoints.test.ts
 */

import assert from 'node:assert/strict';

import {
  createCurrentLocationEndpoint,
  createCustomAddressEndpoint,
  createSavedLocationEndpoint,
} from '../types/route-endpoint';
import { createEmptyTodayRouteSelection } from '../types/today-route-selection';
import type { SavedLocation } from '../types/saved-location';
import {
  buildBriefingRouteSummaryFromSelection,
  formatBriefingRouteLine,
  getEffectiveEndEndpoint,
  getEndpointDisplayLabel,
  isEndpointSelected,
  isRouteSelectionComplete,
  resolveEndpointForDisplay,
  sanitizeRouteEndpoint,
  serializeRouteEndpointForStorage,
} from './route-endpoints';
import { updateTodayRouteEnd, updateTodayRouteStart } from './today-route-selection';

function runTests(): void {
  const current = createCurrentLocationEndpoint();
  const homeSaved: SavedLocation = {
    id: 'loc-home',
    label: 'Home',
    address: '123 Main St',
    latitude: 39.78,
    longitude: -89.65,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const locationsById = { [homeSaved.id]: homeSaved };

  assert.equal(getEndpointDisplayLabel(current, locationsById), 'Current Location');
  assert.equal(
    getEndpointDisplayLabel(createSavedLocationEndpoint('loc-home'), locationsById),
    'Home',
  );
  assert.equal(
    resolveEndpointForDisplay(createSavedLocationEndpoint('missing'), locationsById)
      ?.isResolved,
    false,
  );

  assert.equal(isEndpointSelected(current), true);
  assert.equal(isEndpointSelected(null), false);

  let selection = createEmptyTodayRouteSelection('2026-07-21');
  selection = updateTodayRouteStart(selection, current);
  selection = updateTodayRouteEnd(
    selection,
    createCustomAddressEndpoint({ label: 'Depot', address: '100 Warehouse Rd' }),
  );
  selection = { ...selection, returnToStart: false };

  assert.deepEqual(getEffectiveEndEndpoint(selection), selection.endEndpoint);

  selection = { ...selection, returnToStart: true };
  assert.deepEqual(getEffectiveEndEndpoint(selection), selection.startEndpoint);

  const completeWithReturn = updateTodayRouteStart(
    createEmptyTodayRouteSelection('2026-07-21'),
    current,
  );
  assert.equal(
    isRouteSelectionComplete(completeWithReturn, [homeSaved]),
    true,
  );

  const completeSeparate = updateTodayRouteEnd(
    updateTodayRouteStart(createEmptyTodayRouteSelection('2026-07-21'), current),
    createSavedLocationEndpoint('loc-home'),
  );
  const separateSelection = { ...completeSeparate, returnToStart: false };

  assert.equal(isRouteSelectionComplete(separateSelection, [homeSaved]), true);

  const summary = buildBriefingRouteSummaryFromSelection(
    { ...completeWithReturn, returnToStart: true },
    [homeSaved],
  );

  assert.ok(summary);
  assert.equal(summary?.startLabel, 'Current Location');
  assert.equal(summary?.endLabel, 'Current Location');
  assert.equal(
    formatBriefingRouteLine(summary!, 6),
    'Current Location → 6 stops → Current Location',
  );

  const mixedSummary = buildBriefingRouteSummaryFromSelection(separateSelection, [homeSaved]);
  assert.equal(
    formatBriefingRouteLine(mixedSummary!, 6),
    'Current Location → 6 stops → Home',
  );

  const sanitizedCurrent = sanitizeRouteEndpoint({ type: 'current_location', label: 'Current Location' });
  assert.deepEqual(sanitizedCurrent, current);

  const legacyAddress = sanitizeRouteEndpoint({
    type: 'address',
    label: 'Home',
    address: '123 Main',
    latitude: 91,
    longitude: null,
  });

  assert.equal(legacyAddress?.type, 'custom_address');

  const serialized = serializeRouteEndpointForStorage(current);
  assert.deepEqual(serialized, current);

  console.log('route-endpoints tests passed');
}

runTests();
