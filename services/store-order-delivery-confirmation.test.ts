/**
 * Run with: npx tsx services/store-order-delivery-confirmation.test.ts
 */

import assert from 'node:assert/strict';

import {
  confirmStoreOrderDeliveredWithUndo,
  undoStoreOrderConfirmation,
  __resetStoreOrderConfirmationInFlightForTests,
} from '@/services/store-order-delivery-confirmation';
import {
  __resetStoreOrdersStorageForTests,
  __setStoreOrdersStorageForTests,
  getOrdersForStore,
} from '@/services/store-orders';
import type { StoreOrder } from '@/types/store-order';

function pendingOrder(id: string): StoreOrder {
  const now = new Date().toISOString();

  return {
    id,
    storeId: 'store-a',
    placedAt: '08-01-26',
    expectedDeliveryDate: '08-01-26',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

async function runTests() {
  __resetStoreOrderConfirmationInFlightForTests();
  __setStoreOrdersStorageForTests([pendingOrder('order-undo-1')]);

  const previous = (await getOrdersForStore('store-a'))[0]!;

  const confirmed = await confirmStoreOrderDeliveredWithUndo(previous);
  assert.equal(confirmed.order?.status, 'delivered');
  assert.equal(confirmed.order?.expectedDeliveryDate, previous.expectedDeliveryDate);
  assert.ok(confirmed.order?.confirmedAt);

  const restored = await undoStoreOrderConfirmation(confirmed.snapshot!);
  assert.equal(restored?.id, 'order-undo-1');
  assert.equal(restored?.status, 'pending');
  assert.equal(restored?.expectedDeliveryDate, previous.expectedDeliveryDate);
  assert.equal(restored?.confirmedAt, undefined);

  __setStoreOrdersStorageForTests([pendingOrder('order-guard-1')]);
  __resetStoreOrderConfirmationInFlightForTests();

  const again = (await getOrdersForStore('store-a'))[0]!;
  const [first, second] = await Promise.all([
    confirmStoreOrderDeliveredWithUndo(again),
    confirmStoreOrderDeliveredWithUndo(again),
  ]);

  const successCount = [first.order, second.order].filter(Boolean).length;
  assert.equal(successCount, 1);

  const stored = await getOrdersForStore('store-a');
  assert.equal(stored.filter((row) => row.status === 'delivered').length, 1);

  __resetStoreOrdersStorageForTests();
  __resetStoreOrderConfirmationInFlightForTests();

  console.log('store-order-delivery-confirmation tests passed');
}

void runTests();
