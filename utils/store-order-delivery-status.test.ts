import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  __resetStoreOrdersStorageForTests,
  __setStoreOrdersStorageForTests,
  createStoreOrder,
  getOrdersForStore,
  getPendingStoreOrders,
  markStoreOrderDelivered,
} from '@/services/store-orders';
import {
  __resetStoreOrderDeliveryChecksStorageForTests,
  __setStoreOrderDeliveryChecksStorageForTests,
  createStoreOrderDeliveryCheck,
} from '@/services/store-order-delivery-checks';
import type { StoreOrderStatus } from '@/types/store-order';
import { resolveDisplayedPendingOrderId } from '@/utils/store-order-delivery-status';
import { sortPendingStoreOrders } from '@/utils/store-order-presentation';

async function runTests() {
  const ordersSummarySource = readFileSync(
    path.join(process.cwd(), 'components/store/orders-summary-card.tsx'),
    'utf8',
  );
  const pendingOrdersSource = readFileSync(
    path.join(process.cwd(), 'components/store/pending-orders-sheet.tsx'),
    'utf8',
  );

  const deliveryStatusSource = readFileSync(
    path.join(process.cwd(), 'components/store/delivery-status-sheet.tsx'),
    'utf8',
  );

  assert.match(ordersSummarySource, /Delivery Status/);
  assert.doesNotMatch(ordersSummarySource, /Mark Delivered/);
  assert.match(pendingOrdersSource, /Delivery Status/);
  assert.doesNotMatch(pendingOrdersSource, /Mark Delivered/);
  assert.match(deliveryStatusSource, /Not Received/);
  assert.doesNotMatch(deliveryStatusSource, /Still Pending/);

  __resetStoreOrdersStorageForTests();
  __resetStoreOrderDeliveryChecksStorageForTests();
  __setStoreOrdersStorageForTests([]);
  __setStoreOrderDeliveryChecksStorageForTests([]);

  const storeId = 'store-alpha';
  const firstOrder = await createStoreOrder({
    storeId,
    placedAt: '07-18-26',
    expectedDeliveryDate: '07-25-26',
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 2);
  });
  const secondOrder = await createStoreOrder({
    storeId,
    placedAt: '07-18-26',
    expectedDeliveryDate: '07-22-26',
  });

  assert.notEqual(firstOrder.id, secondOrder.id);

  const pending = await getPendingStoreOrders(storeId);
  assert.equal(resolveDisplayedPendingOrderId(pending), secondOrder.id);

  const stillPendingSnapshot = pending.find((order) => order.id === firstOrder.id);
  assert.equal(stillPendingSnapshot?.status, 'pending');
  assert.equal(stillPendingSnapshot?.deliveredAt, undefined);

  const pendingWithoutAction = await getPendingStoreOrders(storeId);
  const unchanged = pendingWithoutAction.find((order) => order.id === firstOrder.id);
  assert.equal(unchanged?.status, 'pending');
  assert.equal(unchanged?.deliveredAt, undefined);

  await createStoreOrderDeliveryCheck({
    orderId: firstOrder.id,
    storeId,
    outcome: 'not_received',
  });
  const afterNotReceived = await getPendingStoreOrders(storeId);
  assert.equal(afterNotReceived.find((order) => order.id === firstOrder.id)?.status, 'pending');
  assert.equal(
    afterNotReceived.find((order) => order.id === firstOrder.id)?.deliveredAt,
    undefined,
  );

  await markStoreOrderDelivered(secondOrder.id);

  const pendingAfterDelivery = await getPendingStoreOrders(storeId);
  assert.equal(pendingAfterDelivery.length, 1);
  assert.equal(pendingAfterDelivery[0]?.id, firstOrder.id);
  assert.equal(
    (await getOrdersForStore(storeId)).find((order) => order.id === secondOrder.id)?.status,
    'delivered',
  );
  assert.equal(
    (await getOrdersForStore(storeId)).find((order) => order.id === firstOrder.id)?.status,
    'pending',
  );

  const validStatuses: StoreOrderStatus[] = ['pending', 'delivered'];
  assert.deepEqual(validStatuses, ['pending', 'delivered']);

  const sorted = sortPendingStoreOrders(pendingWithoutAction);
  assert.equal(resolveDisplayedPendingOrderId(sorted), secondOrder.id);

  __resetStoreOrdersStorageForTests();
  __resetStoreOrderDeliveryChecksStorageForTests();

  console.log('store-order-delivery-status tests passed');
}

void runTests();
