import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { ensureReadableAddressesForStores } from '@/services/store-display-address';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { ensureStoreSeedData } from '@/services/seed-stores';
import { getAllStoreOrderDeliveryChecks } from '@/services/store-order-delivery-checks';
import { getStoreGroups, removeStoreFromAllGroups } from '@/services/store-groups';
import { getAllStoreOrders } from '@/services/store-orders';
import { deleteStore, getStores } from '@/services/stores';
import { getAllResolvedVisits, getTodayVisits } from '@/services/store-visits';
import { getWorkdayTemplates } from '@/services/workday-templates';
import type { StoreGroup } from '@/types/store-group';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { WorkdayTemplate } from '@/types/workday-template';
import {
  buildLatestNotReceivedChecksByOrderId,
  buildStoresMapSmartFilterIndex,
  type StoresMapSmartFilterIndex,
} from '@/utils/stores-map-smart-filter-index';
import {
  buildStoreWorkdayAssignmentIndex,
  type StoreWorkdayAssignmentIndex,
} from '@/utils/store-workday-assignment-index';

export type StoreListItem = {
  store: Store;
  visit: StoreVisit | null;
};

export type StoresLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useStoresScreenData() {
  const [items, setItems] = useState<StoreListItem[]>([]);
  const [templates, setTemplates] = useState<WorkdayTemplate[]>([]);
  const [storeGroups, setStoreGroups] = useState<StoreGroup[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [deliveryChecks, setDeliveryChecks] = useState<StoreOrderDeliveryCheck[]>([]);
  const [resolvedVisits, setResolvedVisits] = useState<StoreVisit[]>([]);
  const [assignmentIndex, setAssignmentIndex] =
    useState<StoreWorkdayAssignmentIndex | null>(null);
  const [loadStatus, setLoadStatus] = useState<StoresLoadStatus>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadStores = useCallback(async (options?: { silent?: boolean }) => {
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    const silent = options?.silent === true && hasLoadedRef.current;

    if (!silent) {
      setLoadStatus('loading');
    }

    setLoadError(null);

    try {
      await ensureStoreSeedData();
      const [stores, visits, workdayTemplates, remap, groups, allOrders, allVisits, checks] =
        await Promise.all([
          getStores(),
          getTodayVisits(),
          getWorkdayTemplates(),
          getStoreImportIdRemap(),
          getStoreGroups(),
          getAllStoreOrders(),
          getAllResolvedVisits(),
          getAllStoreOrderDeliveryChecks(),
        ]);

      if (!mountedRef.current || loadGenerationRef.current !== generation) {
        return;
      }

      const readableById = await ensureReadableAddressesForStores(stores);

      if (!mountedRef.current || loadGenerationRef.current !== generation) {
        return;
      }

      const visitByStoreId = new Map(visits.map((visit) => [visit.storeId, visit]));
      const enrichedStores = stores.map((store) => readableById[store.id] ?? store);
      const mapped = enrichedStores.map((store) => ({
        store,
        visit: visitByStoreId.get(store.id) ?? null,
      }));

      const validStoreIds = new Set(enrichedStores.map((store) => store.id));
      const index = buildStoreWorkdayAssignmentIndex({
        templates: workdayTemplates,
        storeIdRemap: remap,
        validStoreIds,
      });

      if (!mountedRef.current || loadGenerationRef.current !== generation) {
        return;
      }

      setItems(mapped);
      setTemplates(workdayTemplates);
      setStoreGroups(groups);
      setOrders(allOrders);
      setDeliveryChecks(checks);
      setResolvedVisits(allVisits);
      setAssignmentIndex(index);
      hasLoadedRef.current = true;
      setLoadStatus('ready');
    } catch (error) {
      console.error('[StoresScreen] load failed:', error);

      if (!mountedRef.current || loadGenerationRef.current !== generation) {
        return;
      }

      setLoadError('Could not load stores. Check your connection and try again.');
      setLoadStatus('error');
    }
  }, []);

  const smartFilterIndex: StoresMapSmartFilterIndex = useMemo(() => {
    const storeIds = items.map((item) => item.store.id);

    return buildStoresMapSmartFilterIndex({
      checksByOrderId: buildLatestNotReceivedChecksByOrderId(deliveryChecks),
      orders,
      storeIds,
      visits: resolvedVisits,
    });
  }, [deliveryChecks, items, orders, resolvedVisits]);

  useFocusEffect(
    useCallback(() => {
      void loadStores({ silent: hasLoadedRef.current });
    }, [loadStores]),
  );

  const removeStoreFromList = useCallback((storeId: string) => {
    setItems((current) => current.filter((item) => item.store.id !== storeId));
    setStoreGroups((current) =>
      current.map((group) => ({
        ...group,
        storeIds: group.storeIds.filter((id) => id !== storeId),
      })),
    );
  }, []);

  const handleDeleteStore = useCallback(
    async (store: Store): Promise<boolean> => {
      const deleted = await deleteStore(store.id);

      if (deleted) {
        await removeStoreFromAllGroups(store.id);
        removeStoreFromList(store.id);
      }

      return deleted;
    },
    [removeStoreFromList],
  );

  return {
    assignmentIndex,
    deliveryChecks,
    handleDeleteStore,
    items,
    loadError,
    loadStatus,
    orders,
    refresh: loadStores,
    resolvedVisits,
    smartFilterIndex,
    storeGroups,
    templates,
  };
}
