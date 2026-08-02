import assert from 'node:assert/strict';

import { isOpenAtMinuteOfDay, isMinuteInSameDayRange } from '@/utils/minute-of-day';
import {
  buildStoreOpenStatusPresentation,
  normalizeStoreOperatingHours,
} from '@/utils/store-operating-hours-presentation';
import type { Store } from '@/types/store';

function storeWithHours(openMinutes: number, closeMinutes: number): Store {
  const now = Date.now();

  return {
    id: 's1',
    name: 'Test',
    addressLine1: '1 Main',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    operatingHours: { openMinutes, closeMinutes },
    createdAt: now,
    updatedAt: now,
  };
}

function runTests() {
  const closeAtTenPm = 22 * 60;

  assert.equal(isOpenAtMinuteOfDay(21 * 60 + 59, 8 * 60, closeAtTenPm), true);
  assert.equal(isOpenAtMinuteOfDay(closeAtTenPm, 8 * 60, closeAtTenPm), false);
  assert.equal(isOpenAtMinuteOfDay(22 * 60 + 43, 8 * 60, closeAtTenPm), false);

  assert.equal(isOpenAtMinuteOfDay(0, 22 * 60, 6 * 60), true);
  assert.equal(isOpenAtMinuteOfDay(5 * 60 + 59, 22 * 60, 6 * 60), true);
  assert.equal(isOpenAtMinuteOfDay(6 * 60, 22 * 60, 6 * 60), false);

  const noon = 12 * 60;
  const midnight = 0;
  assert.equal(isMinuteInSameDayRange(noon, 8 * 60, 17 * 60), true);
  assert.equal(isMinuteInSameDayRange(midnight, 0, 60), true);

  const open959 = buildStoreOpenStatusPresentation({
    hours: normalizeStoreOperatingHours(storeWithHours(8 * 60, closeAtTenPm)),
    nowMinuteOfDay: 21 * 60 + 59,
    locale: 'en-US',
  });
  assert.equal(open959.kind, 'open');

  const closedExact = buildStoreOpenStatusPresentation({
    hours: normalizeStoreOperatingHours(storeWithHours(8 * 60, closeAtTenPm)),
    nowMinuteOfDay: closeAtTenPm,
  });
  assert.equal(closedExact.kind, 'closed');
  assert.match(closedExact.badgeText ?? '', /Closed at/);

  const closed1043 = buildStoreOpenStatusPresentation({
    hours: normalizeStoreOperatingHours(storeWithHours(8 * 60, closeAtTenPm)),
    nowMinuteOfDay: 22 * 60 + 43,
  });
  assert.equal(closed1043.kind, 'closed');

  const unknown = buildStoreOpenStatusPresentation({
    hours: null,
    nowMinuteOfDay: 600,
  });
  assert.equal(unknown.kind, 'unknown');

  console.log('store-operating-hours-presentation tests passed');
}

runTests();
