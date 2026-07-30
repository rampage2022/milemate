import { useCallback, useEffect, useState } from 'react';

import { getStoreById } from '@/services/stores';
import { getPendingOrdersExpectedOnDate } from '@/services/store-orders';
import type { Store } from '@/types/store';
import type { StoreOrder } from '@/types/store-order';
import { getTodayDateString } from '@/utils/today-date';

export type DeliveryScheduledTodayRow = {
  onRoute: boolean;
  order: StoreOrder;
  store: Store | null;
  storeId: string;
};

export function useDeliveriesScheduledToday(input: {
  enabled: boolean;
  routeStoreIds: string[];
}) {
  const [rows, setRows] = useState<DeliveryScheduledTodayRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!input.enabled) {
      setRows([]);
      return;
    }

    setIsLoading(true);

    try {
      const orders = await getPendingOrdersExpectedOnDate(new Date());
      const routeSet = new Set(input.routeStoreIds);
      const byStore = new Map<string, StoreOrder>();

      for (const order of orders) {
        const existing = byStore.get(order.storeId);

        if (!existing || order.expectedDeliveryDate < existing.expectedDeliveryDate) {
          byStore.set(order.storeId, order);
        }
      }

      const nextRows: DeliveryScheduledTodayRow[] = await Promise.all(
        [...byStore.entries()].map(async ([storeId, order]) => ({
          storeId,
          order,
          store: await getStoreById(storeId),
          onRoute: routeSet.has(storeId),
        })),
      );

      nextRows.sort((left, right) => {
        const leftName = left.store?.name ?? left.storeId;
        const rightName = right.store?.name ?? right.storeId;

        return leftName.localeCompare(rightName);
      });

      setRows(nextRows);
    } finally {
      setIsLoading(false);
    }
  }, [input.enabled, input.routeStoreIds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const count = rows.length;
  const offRouteCount = rows.filter((row) => !row.onRoute).length;

  return {
    count,
    isLoading,
    offRouteCount,
    refresh,
    rows,
    todayKey: getTodayDateString(),
  };
}
