import assert from 'node:assert/strict';

import { resolveHomeStartLocationDisplay } from './home-start-location-display';

const savedLocation = {
  id: 'loc-1',
  label: 'Home',
  address: '1714 Williams Rd, Irving, TX',
  latitude: 32.8,
  longitude: -96.9,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

assert.deepEqual(
  resolveHomeStartLocationDisplay({
    myLocations: [savedLocation],
    planningStartLocation: null,
  }),
  {
    addressLine: '1714 Williams Rd, Irving, TX',
    latitude: 32.8,
    longitude: -96.9,
    ready: true,
  },
);

assert.deepEqual(
  resolveHomeStartLocationDisplay({
    myLocations: [],
    planningStartLocation: {
      id: 'start-1',
      formattedAddress: '410 Oak Street\nSpringfield, IL 62704',
      latitude: 39.7,
      longitude: -89.6,
      source: 'profile',
    },
  }).addressLine,
  '410 Oak Street, Springfield, IL 62704',
);

assert.equal(
  resolveHomeStartLocationDisplay({
    myLocations: [savedLocation],
    planningStartLocation: {
      id: 'start-2',
      formattedAddress: '99 Plan Way, Dallas, TX',
      latitude: 32.9,
      longitude: -96.8,
      source: 'manual',
    },
  }).addressLine,
  '99 Plan Way, Dallas, TX',
);

console.log('home-start-location-display tests passed');
