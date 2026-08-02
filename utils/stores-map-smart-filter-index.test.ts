import assert from 'node:assert/strict';

import type { StoreOrder } from '@/types/store-order';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildStoresMapSmartFilterIndex,
  localDayDifferenceFromToday,
  storeQualifiesForNoVisit7Plus,
} from '@/utils/stores-map-smart-filter-index';
import { startOfLocalDay } from '@/utils/store-order-delivery-presentation';

function runTests() {
  const reference = new Date(2026, 7, 1, 12, 0, 0, 0);
  const eightDaysAgo = startOfLocalDay(reference).getTime() - 8 * 86_400_000;

  assert.equal(localDayDifferenceFromToday(eightDaysAgo, reference), 8);
  assert.equal(
    storeQualifiesForNoVisit7Plus({ lastCompletedAtMs: null, referenceDate: reference }),
    true,
  );
  assert.equal(
    storeQualifiesForNoVisit7Plus({
      lastCompletedAtMs: eightDaysAgo,
      referenceDate: reference,
    }),
    true,
  );

  const orders: StoreOrder[] = [
    {
      createdAt: '2026-07-01T00:00:00.000Z',
      expectedDeliveryDate: '08-05-26',
      id: 'order-1',
      placedAt: '07-01-26',
      status: 'pending',
      storeId: 'store-a',
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    {
      createdAt: '2026-06-01T00:00:00.000Z',
      expectedDeliveryDate: '06-01-26',
      id: 'order-2',
      placedAt: '06-01-26',
      status: 'pending',
      storeId: 'store-b',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
  ];

  const visits: StoreVisit[] = [
    {
      completedAt: eightDaysAgo,
      createdAt: eightDaysAgo,
      id: 'visit-1',
      notes: [],
      routeOrder: 1,
      scheduledDate: '2026-07-20',
      status: 'completed',
      storeId: 'store-a',
      tripId: 'trip',
      updatedAt: eightDaysAgo,
    },
  ];

  const index = buildStoresMapSmartFilterIndex({
    orders,
    referenceDate: reference,
    storeIds: ['store-a', 'store-b', 'store-c'],
    visits,
  });

  assert.ok(index.deliverySoonStoreIds.has('store-a'));
  assert.ok(index.missedDeliveryStoreIds.has('store-b'));
  assert.ok(index.noVisit7PlusStoreIds.has('store-a'));
  assert.ok(index.noVisit7PlusStoreIds.has('store-c'));
  assert.ok(index.noDelivery7PlusStoreIds.has('store-c'));

  console.log('stores-map-smart-filter-index tests passed');
}

runTests();
