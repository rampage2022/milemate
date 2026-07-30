import { useCallback, useEffect, useMemo, useState } from 'react';

import { getLatestNotReceivedCheckForOrder } from '@/services/store-order-delivery-checks';
import { getAllStoreOrders } from '@/services/store-orders';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import {
  resolveRouteDeliveryChipModel,
  type RouteDeliveryChipModel,
} from '@/utils/route-store-delivery-signal';

export function useRouteDeliveryByStoreId(storeIds: string[]): {
  deliveryByStoreId: Record<string, RouteDeliveryChipModel | null>;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const storeKey = useMemo(() => [...new Set(storeIds)].sort().join('|'), [storeIds]);
  const [deliveryByStoreId, setDeliveryByStoreId] = useState<
    Record<string, RouteDeliveryChipModel | null>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const ids = new Set(storeIds);
      const allOrders = await getAllStoreOrders();
      const relevantOrders = allOrders.filter((order) => ids.has(order.storeId));

      const checksByOrderId: Record<string, StoreOrderDeliveryCheck | null> = {};

      await Promise.all(
        relevantOrders.map(async (order) => {
          checksByOrderId[order.id] = await getLatestNotReceivedCheckForOrder(order.id);
        }),
      );

      const nextMap: Record<string, RouteDeliveryChipModel | null> = {};

      for (const storeId of ids) {
        const orders = relevantOrders.filter((order) => order.storeId === storeId);
        nextMap[storeId] = resolveRouteDeliveryChipModel({
          orders,
          checksByOrderId,
        });
      }

      setDeliveryByStoreId(nextMap);
    } catch (error) {
      console.error('[useRouteDeliveryByStoreId] refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeIds]);

  useEffect(() => {
    void refresh();
  }, [refresh, storeKey]);

  return { deliveryByStoreId, isLoading, refresh };
}
