/**
 * Run with: npx tsx utils/store-deliveries-queue.test.ts
 */

import assert from 'node:assert/strict';

import type { StoreOrder } from '@/types/store-order';
import {
  addLocalCalendarDays,
  diffLocalCalendarDays,
  isStoreOrderDateWithinPastCalendarDaysInclusive,
} from '@/utils/local-calendar-date';
import { formatStoreOrderDateString } from '@/utils/store-order-presentation';
import {
  buildStoreDeliveriesNeedsConfirmationQueue,
  buildStoreDeliveriesUpcomingQueue,
  dedupeOrdersByStableRecordId,
  filterOrdersForCanonicalStore,
  isNewEntryDateAllowedForQuickFlow,
  STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS,
} from '@/utils/store-deliveries-queue';

function order(partial: Partial<StoreOrder> & Pick<StoreOrder, 'id'>): StoreOrder {
  const now = new Date().toISOString();

  return {
    storeId: 'store-a',
    placedAt: formatStoreOrderDateString(new Date()),
    expectedDeliveryDate: formatStoreOrderDateString(new Date()),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

const reference = new Date(2026, 7, 2);

const today = formatStoreOrderDateString(reference);
const day14 = formatStoreOrderDateString(addLocalCalendarDays(reference, -14));
const day15 = formatStoreOrderDateString(addLocalCalendarDays(reference, -15));
const future = formatStoreOrderDateString(addLocalCalendarDays(reference, 3));

const remap = new Map([['store-old', 'store-a']]);

const twoSameDay = buildStoreDeliveriesNeedsConfirmationQueue({
  orders: [
    order({ id: 'delivery-a', expectedDeliveryDate: today }),
    order({ id: 'delivery-b', expectedDeliveryDate: today }),
  ],
  checksByOrderId: {},
  reference,
});

assert.equal(twoSameDay.length, 2);
assert.deepEqual(
  twoSameDay.map((row) => row.orderId).sort(),
  ['delivery-a', 'delivery-b'],
);

const aliasOrder = order({
  id: 'order-canonical-1',
  storeId: 'store-old',
  expectedDeliveryDate: today,
});

const aliasScoped = filterOrdersForCanonicalStore({
  canonicalStoreId: 'store-a',
  orders: [aliasOrder],
  storeIdRemap: remap,
});

assert.equal(aliasScoped.length, 1);
assert.equal(aliasScoped[0]?.id, 'order-canonical-1');

const duplicateIdRows = dedupeOrdersByStableRecordId([
  order({ id: 'same-id', updatedAt: '2026-01-01T00:00:00.000Z' }),
  order({
    id: 'same-id',
    updatedAt: '2026-02-01T00:00:00.000Z',
    note: 'newer',
  }),
]);

assert.equal(duplicateIdRows.length, 1);
assert.equal(duplicateIdRows[0]?.note, 'newer');

const scoped = filterOrdersForCanonicalStore({
  canonicalStoreId: 'store-a',
  orders: [
    order({ id: 'o-today', expectedDeliveryDate: today }),
    order({ id: 'o-14', expectedDeliveryDate: day14 }),
    order({ id: 'o-15', expectedDeliveryDate: day15, status: 'pending' }),
    order({ id: 'o-future', expectedDeliveryDate: future }),
    order({ id: 'o-delivered', expectedDeliveryDate: today, status: 'delivered' }),
    order({ id: 'o-missed', expectedDeliveryDate: today, status: 'missed' }),
    order({ id: 'o-other-store', storeId: 'store-b', expectedDeliveryDate: today }),
    order({ id: 'o-alias', storeId: 'store-old', expectedDeliveryDate: today }),
    order({ id: 'o-second-same-day', storeId: 'store-a', expectedDeliveryDate: today }),
  ],
  storeIdRemap: remap,
});

const needs = buildStoreDeliveriesNeedsConfirmationQueue({
  orders: scoped,
  checksByOrderId: {},
  reference,
});

assert.deepEqual(
  needs.map((row) => row.orderId).sort(),
  ['o-14', 'o-alias', 'o-second-same-day', 'o-today'].sort(),
);

assert.equal(
  isStoreOrderDateWithinPastCalendarDaysInclusive({
    expectedDeliveryDate: today,
    pastDays: STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS,
    reference,
  }),
  true,
);

assert.equal(
  isStoreOrderDateWithinPastCalendarDaysInclusive({
    expectedDeliveryDate: day14,
    pastDays: STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS,
    reference,
  }),
  true,
);

assert.equal(
  isStoreOrderDateWithinPastCalendarDaysInclusive({
    expectedDeliveryDate: day15,
    pastDays: STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS,
    reference,
  }),
  false,
);

const upcoming = buildStoreDeliveriesUpcomingQueue({
  orders: [
    order({ id: 'o-future', expectedDeliveryDate: future }),
    order({ id: 'o-today', expectedDeliveryDate: today }),
  ],
  checksByOrderId: {},
  reference,
});

assert.deepEqual(upcoming.map((row) => row.orderId), ['o-future']);

assert.equal(
  isNewEntryDateAllowedForQuickFlow({ expectedDeliveryDate: day15, reference }),
  false,
);

const springForward = new Date(2026, 2, 8);
const day14BeforeDst = addLocalCalendarDays(springForward, -14);
const day15BeforeDst = addLocalCalendarDays(springForward, -15);

assert.equal(diffLocalCalendarDays(day14BeforeDst, springForward), 14);
assert.equal(diffLocalCalendarDays(day15BeforeDst, springForward), 15);

const day14Str = formatStoreOrderDateString(day14BeforeDst);
const day15Str = formatStoreOrderDateString(day15BeforeDst);

assert.equal(
  isStoreOrderDateWithinPastCalendarDaysInclusive({
    expectedDeliveryDate: day14Str,
    pastDays: 14,
    reference: springForward,
  }),
  true,
);

assert.equal(
  isStoreOrderDateWithinPastCalendarDaysInclusive({
    expectedDeliveryDate: day15Str,
    pastDays: 14,
    reference: springForward,
  }),
  false,
);

console.log('store-deliveries-queue tests passed');
