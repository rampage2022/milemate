/**
 * Run with: npx tsx utils/route-store-delivery-signal.test.ts
 */

import assert from 'node:assert/strict';

import type { StoreOrder } from '@/types/store-order';
import { resolveRouteDeliveryChipModel } from '@/utils/route-store-delivery-signal';

const referenceDate = new Date('2026-07-22T12:00:00');

function order(expectedDeliveryDate: string, id = 'order-1'): StoreOrder {
  return {
    id,
    storeId: 'store-1',
    expectedDeliveryDate,
    status: 'pending',
    placedAt: '07-20-26',
    createdAt: '07-20-26',
    updatedAt: '07-20-26',
  };
}

const today = resolveRouteDeliveryChipModel({
  orders: [order('07-22-26')],
  checksByOrderId: {},
  referenceDate,
});

assert.equal(today?.status, 'today');
assert.equal(today?.statusLabel, 'Delivery Today');

const scheduled = resolveRouteDeliveryChipModel({
  orders: [order('07-25-26')],
  checksByOrderId: {},
  referenceDate,
});

assert.equal(scheduled?.status, 'scheduled');
assert.equal(scheduled?.statusLabel, 'Delivery Scheduled');

const missed = resolveRouteDeliveryChipModel({
  orders: [order('07-21-26')],
  checksByOrderId: {},
  referenceDate,
});

assert.equal(missed?.status, 'missed');
assert.equal(missed?.statusLabel, 'Delivery Missed');

assert.equal(
  resolveRouteDeliveryChipModel({ orders: [], checksByOrderId: {}, referenceDate }),
  null,
);

console.log('route-store-delivery-signal.test.ts: ok');
