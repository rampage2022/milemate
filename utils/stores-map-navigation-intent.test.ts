import assert from 'node:assert/strict';

import {
  applyStoresMapNavigationIntentToFilterState,
  buildMissedDeliveryStoresMapNavigationIntent,
  clearStoresMapNavigationIntentForTests,
  consumeStoresMapNavigationIntent,
  resolveStoresMapNavigationScope,
  shouldFitStoresMapToVisibleMarkers,
  shouldShowStoresMapPreviewBackButton,
  stageStoresMapNavigationIntent,
} from '@/utils/stores-map-navigation-intent';
import { buildStoresMapSmartFilterIndex } from '@/utils/stores-map-smart-filter-index';

function smartIndexForMissed(storeIds: string[]) {
  return buildStoresMapSmartFilterIndex({
    checksByOrderId: {},
    orders: [
      {
        createdAt: '2026-07-01T00:00:00.000Z',
        expectedDeliveryDate: '07-28-26',
        id: 'order-1',
        placedAt: '2026-07-01T00:00:00.000Z',
        status: 'pending',
        storeId: 'store-b',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ],
    referenceDate: new Date('2026-08-01T12:00:00'),
    storeIds,
    visits: [],
  });
}

function runTests() {
  clearStoresMapNavigationIntentForTests();

  const index = smartIndexForMissed(['store-a', 'store-b', 'store-c']);
  const canonical = new Set(['store-a', 'store-b']);

  const single = buildMissedDeliveryStoresMapNavigationIntent({
    canonicalStoreIds: canonical,
    routeStoreIds: ['store-b', 'store-x'],
    smartFilterIndex: index,
  });

  assert.equal(single.scope, 'today');
  assert.equal(single.selectedStoreId, 'store-b');
  assert.equal(single.smartFilter, undefined);

  const multiple = buildMissedDeliveryStoresMapNavigationIntent({
    canonicalStoreIds: new Set(['store-a', 'store-b']),
    routeStoreIds: ['store-a', 'store-b'],
    smartFilterIndex: buildStoresMapSmartFilterIndex({
      checksByOrderId: {},
      orders: [
        {
          createdAt: '2026-07-01T00:00:00.000Z',
          expectedDeliveryDate: '07-28-26',
          id: 'o1',
          placedAt: '2026-07-01T00:00:00.000Z',
          status: 'pending',
          storeId: 'store-a',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
        {
          createdAt: '2026-07-01T00:00:00.000Z',
          expectedDeliveryDate: '07-27-26',
          id: 'o2',
          placedAt: '2026-07-01T00:00:00.000Z',
          status: 'pending',
          storeId: 'store-b',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
      referenceDate: new Date('2026-08-01T12:00:00'),
      storeIds: ['store-a', 'store-b'],
      visits: [],
    }),
  });

  assert.equal(multiple.smartFilter, 'missed-delivery');
  assert.equal(multiple.selectedStoreId, undefined);

  const noneCanonical = buildMissedDeliveryStoresMapNavigationIntent({
    canonicalStoreIds: new Set(['store-z']),
    routeStoreIds: ['store-b'],
    smartFilterIndex: index,
  });

  assert.equal(noneCanonical.smartFilter, 'missed-delivery');
  assert.equal(noneCanonical.selectedStoreId, undefined);
  assert.equal(shouldFitStoresMapToVisibleMarkers(0), false);
  assert.equal(shouldFitStoresMapToVisibleMarkers(2), true);

  stageStoresMapNavigationIntent({ scope: 'today', smartFilter: 'missed-delivery' });
  const consumed = consumeStoresMapNavigationIntent();
  assert.ok(consumed);
  assert.equal(consumeStoresMapNavigationIntent(), null);
  assert.equal(shouldShowStoresMapPreviewBackButton(), false);

  stageStoresMapNavigationIntent({
    scope: 'today',
    smartFilter: 'missed-delivery',
    source: 'workday-preview',
  });
  consumeStoresMapNavigationIntent();
  assert.equal(shouldShowStoresMapPreviewBackButton(), true);
  clearStoresMapNavigationIntentForTests();

  assert.equal(resolveStoresMapNavigationScope({}), 'today');
  assert.deepEqual(
    applyStoresMapNavigationIntentToFilterState({ smartFilter: 'missed-delivery' }).enabledSmartFilters,
    ['missed_delivery'],
  );

  console.log('stores-map-navigation-intent tests passed');
}

runTests();
