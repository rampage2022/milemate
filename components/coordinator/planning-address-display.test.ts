/**
 * Run with: npx tsx components/coordinator/planning-address-display.test.ts
 */

import assert from 'node:assert/strict';

import {
  formatPlanningRouteLocationDisplay,
  formatHomeStartLocationLines,
  formatPlanningStopDisplay,
  formatPlanningStoreAddress,
} from './planning-address-display';
import type { Store } from '@/types/store';

function createStore(overrides: Partial<Store> = {}): Store {
  return {
    id: 'store-1',
    name: '1714 Williams Rd',
    addressLine1: '1714 Williams Rd',
    city: 'Irving',
    state: 'TX',
    postalCode: '75062',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function runTests() {
  const duplicateStreet = formatPlanningStopDisplay(createStore());

  assert.equal(duplicateStreet.title, '1714 Williams Rd');
  assert.equal(duplicateStreet.subtitle, 'Irving, TX 75062');
  assert.equal(formatPlanningStoreAddress(createStore()), '1714 Williams Rd, Irving, TX 75062');

  const malformedWilliams = formatPlanningStopDisplay(
    createStore({
      name: '1714 Williams Rd Williams Rd 1714',
      addressLine1: '1714 Williams Rd',
      city: 'Irving',
      state: 'TX',
      postalCode: '75060',
    }),
  );

  assert.equal(malformedWilliams.title, '1714 Williams Rd');
  assert.equal(malformedWilliams.subtitle, 'Irving, TX 75060');

  const malformedJosey = formatPlanningStopDisplay(
    createStore({
      name: '4788 N Josey Ln N Josey Ln 4788',
      addressLine1: '4788 N Josey Ln',
      city: 'Carrollton',
      state: 'TX',
      postalCode: '75010',
    }),
  );

  assert.equal(malformedJosey.title, '4788 N Josey Ln');
  assert.equal(malformedJosey.subtitle, 'Carrollton, TX 75010');

  const malformedAddressLine = formatPlanningStopDisplay(
    createStore({
      name: '1714 Williams Rd Williams Rd 1714',
      addressLine1: '1714 Williams Rd Williams Rd 1714',
      city: 'Irving',
      state: 'TX',
      postalCode: '75060',
    }),
  );

  assert.equal(malformedAddressLine.title, '1714 Williams Rd');
  assert.equal(malformedAddressLine.subtitle, 'Irving, TX 75060');

  const malformedRouteLocation = formatPlanningRouteLocationDisplay(
    {
      id: 'route-1',
      name: '4788 N Josey Ln N Josey Ln 4788',
      formattedAddress: '4788 N Josey Ln N Josey Ln 4788, Carrollton, TX 75010',
      latitude: 33.0,
      longitude: -96.9,
      source: 'manual',
    },
    'Choose start',
  );

  assert.equal(malformedRouteLocation.primary, '4788 N Josey Ln');
  assert.equal(malformedRouteLocation.secondary, 'Carrollton, TX');

  const homeWilliams = formatHomeStartLocationLines(
    '1714 Williams Rd Williams Rd, Irving, TX 75060',
    '1714 Williams Rd Williams Rd 1714',
  );

  assert.equal(homeWilliams.streetLine, '1714 Williams Rd');
  assert.equal(homeWilliams.localityLine, 'Irving, TX');

  const businessName = formatPlanningStopDisplay(
    createStore({
      name: 'Tom Thumb',
      addressLine1: '410 Oak Street',
      city: 'Dallas',
      state: 'TX',
    }),
  );

  assert.equal(businessName.title, 'Tom Thumb');
  assert.equal(businessName.subtitle, '410 Oak Street, Dallas, TX 75062');

  const reverseGeocodedOnly = formatPlanningStopDisplay(
    createStore({
      name: 'Tom Thumb',
      addressLine1: '38.1234, -90.5678',
      city: '',
      state: '',
      postalCode: '',
      latitude: 38.1234,
      longitude: -90.5678,
      reverseGeocodedAddressLine: '410 Oak Street, Springfield, IL 62704',
    }),
  );

  assert.equal(reverseGeocodedOnly.title, 'Tom Thumb');
  assert.equal(
    reverseGeocodedOnly.subtitle,
    '410 Oak Street, Springfield, IL 62704',
  );

  console.log('planning-address-display tests passed');
}

runTests();
