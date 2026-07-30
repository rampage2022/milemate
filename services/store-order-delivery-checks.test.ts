import assert from 'node:assert/strict';

import {
  __resetStoreOrdersStorageForTests,
  __setStoreOrdersStorageForTests,
  createStoreOrder,
  getAllStoreOrders,
  getPendingOrdersExpectedOnDate,
  getStoresWithDeliveriesExpectedOnDate,
  markStoreOrderDelivered,
} from '@/services/store-orders';
import {
  __resetStoreOrderDeliveryChecksStorageForTests,
  __setStoreOrderDeliveryChecksStorageForTests,
  createStoreOrderDeliveryCheck,
  getDeliveryChecksForOrder,
  getLatestNotReceivedCheckForOrder,
  getStoresWithUnresolvedNotReceivedDeliveries,
  getUnresolvedNotReceivedOrders,
} from '@/services/store-order-delivery-checks';
import { isStoreOrderOverdue } from '@/utils/store-order-delivery-presentation';
import { formatStoreOrderDateString } from '@/utils/store-order-presentation';

async function runTests() {
  __resetStoreOrdersStorageForTests();
  __resetStoreOrderDeliveryChecksStorageForTests();
  __setStoreOrdersStorageForTests([]);
  __setStoreOrderDeliveryChecksStorageForTests([]);

  const storeA = 'store-a';
  const storeB = 'store-b';
  const today = new Date(2026, 6, 18, 14, 0, 0);
  const tomorrow = new Date(2026, 6, 19, 9, 0, 0);
  const yesterday = new Date(2026, 6, 17, 9, 0, 0);

  const orderA = await createStoreOrder({
    storeId: storeA,
    placedAt: '07-18-26',
    expectedDeliveryDate: formatStoreOrderDateString(today),
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 2);
  });
  const orderB = await createStoreOrder({
    storeId: storeB,
    placedAt: '07-18-26',
    expectedDeliveryDate: formatStoreOrderDateString(today),
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 2);
  });
  const orderA2 = await createStoreOrder({
    storeId: storeA,
    placedAt: '07-18-26',
    expectedDeliveryDate: '07-25-26',
  });

  const check = await createStoreOrderDeliveryCheck({
    orderId: orderA.id,
    storeId: storeA,
    outcome: 'not_received',
    visitId: 'visit-1',
  });

  assert.equal(check.outcome, 'not_received');
  assert.equal(check.storeId, storeA);
  assert.equal(check.orderId, orderA.id);
  assert.ok(check.checkedAt);
  assert.equal(check.visitId, 'visit-1');

  const pendingOrder = (await getAllStoreOrders()).find((order) => order.id === orderA.id);
  assert.equal(pendingOrder?.status, 'pending');
  assert.equal(pendingOrder?.deliveredAt, undefined);

  const duplicate = await createStoreOrderDeliveryCheck({
    orderId: orderA.id,
    storeId: storeA,
    outcome: 'not_received',
  });
  assert.equal(duplicate.id, check.id);

  const checksForOrder = await getDeliveryChecksForOrder(orderA.id);
  assert.equal(checksForOrder.length, 1);

  const expectedToday = await getPendingOrdersExpectedOnDate(today);
  assert.equal(expectedToday.length, 2);
  assert.ok(expectedToday.some((order) => order.id === orderA.id));
  assert.ok(expectedToday.some((order) => order.id === orderB.id));

  const storesExpectedToday = await getStoresWithDeliveriesExpectedOnDate(today);
  assert.equal(storesExpectedToday.length, 2);
  assert.ok(storesExpectedToday.includes(storeA));
  assert.ok(storesExpectedToday.includes(storeB));

  const unresolved = await getUnresolvedNotReceivedOrders();
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0]?.id, orderA.id);

  const unresolvedStores = await getStoresWithUnresolvedNotReceivedDeliveries();
  assert.deepEqual(unresolvedStores, [storeA]);

  assert.equal(isStoreOrderOverdue(formatStoreOrderDateString(today), today), false);
  assert.equal(isStoreOrderOverdue(formatStoreOrderDateString(today), tomorrow), true);
  assert.equal(isStoreOrderOverdue(formatStoreOrderDateString(today), yesterday), false);
  assert.equal(isStoreOrderOverdue(formatStoreOrderDateString(yesterday), today), true);

  await markStoreOrderDelivered(orderA.id);

  assert.equal((await getUnresolvedNotReceivedOrders()).length, 0);
  assert.equal((await getStoresWithUnresolvedNotReceivedDeliveries()).length, 0);
  assert.equal((await getDeliveryChecksForOrder(orderA.id)).length, 1);
  assert.equal((await getLatestNotReceivedCheckForOrder(orderA.id))?.id, check.id);

  await markStoreOrderDelivered(orderB.id);
  const pendingAfterBothDelivered = await getPendingOrdersExpectedOnDate(today);
  assert.equal(pendingAfterBothDelivered.length, 0);

  await markStoreOrderDelivered(orderA2.id);
  assert.equal((await getAllStoreOrders()).filter((order) => order.status === 'pending').length, 0);

  __resetStoreOrdersStorageForTests();
  __resetStoreOrderDeliveryChecksStorageForTests();

  console.log('store-order-delivery-checks tests passed');
}

void runTests();
