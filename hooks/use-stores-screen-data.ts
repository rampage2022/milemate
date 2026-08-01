import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { ensureReadableAddressesForStores } from '@/services/store-display-address';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { ensureStoreSeedData } from '@/services/seed-stores';
import { deleteStore, getStores } from '@/services/stores';
import { getWorkdayTemplates } from '@/services/workday-templates';
import { getTodayVisits } from '@/services/store-visits';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { WorkdayTemplate } from '@/types/workday-template';
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
      const [stores, visits, workdayTemplates, remap] = await Promise.all([
        getStores(),
        getTodayVisits(),
        getWorkdayTemplates(),
        getStoreImportIdRemap(),
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

  useFocusEffect(
    useCallback(() => {
      void loadStores({ silent: hasLoadedRef.current });
    }, [loadStores]),
  );

  const removeStoreFromList = useCallback((storeId: string) => {
    setItems((current) => current.filter((item) => item.store.id !== storeId));
  }, []);

  const handleDeleteStore = useCallback(
    async (store: Store): Promise<boolean> => {
      const deleted = await deleteStore(store.id);

      if (deleted) {
        removeStoreFromList(store.id);
      }

      return deleted;
    },
    [removeStoreFromList],
  );

  return {
    assignmentIndex,
    handleDeleteStore,
    items,
    loadError,
    loadStatus,
    refresh: loadStores,
    templates,
  };
}
