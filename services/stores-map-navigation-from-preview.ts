import { getAllStoreOrderDeliveryChecks } from '@/services/store-order-delivery-checks';
import { getAllStoreOrders } from '@/services/store-orders';
import { getStores } from '@/services/stores';
import {
  buildMissedDeliveryStoresMapNavigationIntent,
  stageStoresMapNavigationIntent,
  type StoresMapNavigationIntent,
} from '@/utils/stores-map-navigation-intent';
import {
  buildLatestNotReceivedChecksByOrderId,
  buildStoresMapSmartFilterIndex,
} from '@/utils/stores-map-smart-filter-index';

export async function stageWorkdayPreviewMissedDeliveryStoresMapIntent(input: {
  routeStoreIds: readonly string[];
}): Promise<StoresMapNavigationIntent> {
  const [stores, orders, checks] = await Promise.all([
    getStores(),
    getAllStoreOrders(),
    getAllStoreOrderDeliveryChecks(),
  ]);
  const canonicalStoreIds = new Set(stores.map((store) => store.id));
  const smartFilterIndex = buildStoresMapSmartFilterIndex({
    checksByOrderId: buildLatestNotReceivedChecksByOrderId(checks),
    orders,
    storeIds: stores.map((store) => store.id),
    visits: [],
  });
  const intent = buildMissedDeliveryStoresMapNavigationIntent({
    canonicalStoreIds,
    routeStoreIds: input.routeStoreIds,
    smartFilterIndex,
    source: 'workday-preview',
  });

  stageStoresMapNavigationIntent(intent);

  return intent;
}
