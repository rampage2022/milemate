import assert from 'node:assert/strict';

import {
  __resetStoreOrdersStorageForTests,
  __setStoreOrdersStorageForTests,
  createStoreOrder,
  getOrdersForStore,
  getPendingStoreOrders,
  markStoreOrderDelivered,
} from '@/services/store-orders';
import {
  filterPendingStoreOrders,
  sortPendingStoreOrders,
} from '@/utils/store-order-presentation';

async function runTests() {
  __setStoreOrdersStorageForTests([]);

  const storeA = 'store-alpha';
  const storeB = 'store-beta';

  const firstOrder = await createStoreOrder({
    storeId: storeA,
    placedAt: '07-18-26',
    expectedDeliveryDate: '07-25-26',
    note: 'Weekly restock',
  });

  assert.equal(firstOrder.status, 'pending');
  assert.equal(firstOrder.storeId, storeA);

  const secondOrder = await createStoreOrder({
    storeId: storeA,
    placedAt: '07-18-26',
    expectedDeliveryDate: '07-22-26',
  });

  const thirdOrder = await createStoreOrder({
    storeId: storeB,
    placedAt: '07-18-26',
    expectedDeliveryDate: '07-20-26',
  });

  const pendingForStoreA = await getPendingStoreOrders(storeA);
  assert.equal(pendingForStoreA.length, 2);
  assert.equal(pendingForStoreA[0]?.id, secondOrder.id);
  assert.equal(pendingForStoreA[1]?.id, firstOrder.id);

  const pendingForStoreB = await getPendingStoreOrders(storeB);
  assert.equal(pendingForStoreB.length, 1);
  assert.equal(pendingForStoreB[0]?.id, thirdOrder.id);

  const delivered = await markStoreOrderDelivered(secondOrder.id);
  assert.equal(delivered?.status, 'delivered');
  assert.ok(delivered?.deliveredAt);

  const pendingAfterDelivery = await getPendingStoreOrders(storeA);
  assert.equal(pendingAfterDelivery.length, 1);
  assert.equal(pendingAfterDelivery[0]?.id, firstOrder.id);

  const allStoreAOrders = await getOrdersForStore(storeA);
  assert.equal(allStoreAOrders.length, 2);
  assert.equal(
    allStoreAOrders.find((order) => order.id === secondOrder.id)?.status,
    'delivered',
  );

  const sorted = sortPendingStoreOrders(
    filterPendingStoreOrders([
      firstOrder,
      secondOrder,
      { ...thirdOrder, status: 'pending' },
    ]),
  );
  assert.equal(sorted[0]?.expectedDeliveryDate, '07-20-26');

  await assert.rejects(
    () =>
      createStoreOrder({
        storeId: storeA,
        placedAt: '07-18-26',
        expectedDeliveryDate: 'not-a-date',
      }),
  );

  __resetStoreOrdersStorageForTests();

  console.log('store-orders tests passed');
}

void runTests();
