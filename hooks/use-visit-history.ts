import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useVisitAdvancement } from '@/contexts/visit-advancement-context';
import { getStoreById } from '@/services/stores';
import { getAllResolvedVisits } from '@/services/store-visits';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildVisitHistoryItems,
  type VisitHistoryItem,
} from '@/utils/visit-history';

export function useVisitHistory(): {
  isLoading: boolean;
  items: VisitHistoryItem[];
  refresh: () => Promise<void>;
  visits: StoreVisit[];
} {
  const { routeRefreshNonce } = useVisitAdvancement();
  const [visits, setVisits] = useState<StoreVisit[]>([]);
  const [items, setItems] = useState<VisitHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const resolved = await getAllResolvedVisits();
      const storesById: Record<string, Store | null> = {};

      await Promise.all(
        [...new Set(resolved.map((visit) => visit.storeId))].map(async (storeId) => {
          storesById[storeId] = await getStoreById(storeId);
        }),
      );

      setVisits(resolved);
      setItems(buildVisitHistoryItems(resolved, storesById));
    } catch (error) {
      console.error('[useVisitHistory] refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    void refresh();
  }, [refresh, routeRefreshNonce]);

  return useMemo(
    () => ({
      isLoading,
      items,
      refresh,
      visits,
    }),
    [isLoading, items, refresh, visits],
  );
}
