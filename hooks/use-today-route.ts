import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useVisitAdvancement } from '@/contexts/visit-advancement-context';
import { ensureStoreSeedData } from '@/services/seed-stores';
import { geocodeStoresForTodayVisits } from '@/services/store-geocoding';
import { ensureReadableAddressesForStores } from '@/services/store-display-address';
import { getPendingVisitAdvancement } from '@/services/pending-advancement';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { getStoreById } from '@/services/stores';
import type { Store } from '@/types/store';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';
import {
  countCompletedVisits,
  getTodayVisits,
  replaceTodayVisits,
  resolveCurrentVisit,
  resolveNextVisit,
} from '@/services/store-visits';
import type { StoreVisit } from '@/types/store-visit';

export type TodayRouteStore = {
  visit: StoreVisit;
  store: Store;
};

export type TodayRouteState = {
  visits: StoreVisit[];
  storesById: Record<string, Store>;
  current: TodayRouteStore | null;
  next: TodayRouteStore | null;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  isLoading: boolean;
  showContinueToNext: boolean;
  refresh: (options?: { showLoading?: boolean }) => Promise<void>;
};

async function hydrateVisitStore(
  visit: StoreVisit | null,
  remap: Map<string, string>,
): Promise<TodayRouteStore | null> {
  if (!visit) {
    return null;
  }

  const storeId = resolveRemappedStoreId(visit.storeId, remap);
  const store = await getStoreById(storeId);

  if (!store) {
    return null;
  }

  return { visit, store };
}

async function normalizeTodayVisitsForStoreRemap(
  visits: StoreVisit[],
  remap: Map<string, string>,
): Promise<StoreVisit[]> {
  if (remap.size === 0) {
    return visits;
  }

  let changed = false;
  const normalized = visits.map((visit) => {
    const nextStoreId = resolveRemappedStoreId(visit.storeId, remap);

    if (nextStoreId === visit.storeId) {
      return visit;
    }

    changed = true;

    return {
      ...visit,
      storeId: nextStoreId,
      updatedAt: Date.now(),
    };
  });

  if (changed) {
    await replaceTodayVisits(normalized);
  }

  return normalized;
}

async function resolveRouteDisplay(
  todaysVisits: StoreVisit[],
  pendingAdvancement: Awaited<ReturnType<typeof getPendingVisitAdvancement>>,
  remap: Map<string, string>,
): Promise<{ current: TodayRouteStore | null; next: TodayRouteStore | null }> {
  if (pendingAdvancement) {
    const completedVisit = todaysVisits.find(
      (visit) => visit.id === pendingAdvancement.completedVisitId,
    );
    const nextVisit = todaysVisits.find(
      (visit) => visit.id === pendingAdvancement.nextVisitId,
    );

    if (
      completedVisit?.status === 'completed' &&
      nextVisit?.status === 'pending'
    ) {
      return {
        current: await hydrateVisitStore(completedVisit, remap),
        next: await hydrateVisitStore(nextVisit, remap),
      };
    }
  }

  const currentVisit = resolveCurrentVisit(todaysVisits);
  const nextVisit = resolveNextVisit(todaysVisits, currentVisit);

  return {
    current: await hydrateVisitStore(currentVisit, remap),
    next: await hydrateVisitStore(nextVisit, remap),
  };
}

export function useTodayRoute(): TodayRouteState {
  const { pendingAdvancement, phase, routeRefreshNonce } = useVisitAdvancement();
  const [visits, setVisits] = useState<StoreVisit[]>([]);
  const [storesById, setStoresById] = useState<Record<string, Store>>({});
  const [current, setCurrent] = useState<TodayRouteStore | null>(null);
  const [next, setNext] = useState<TodayRouteStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContinueToNext, setShowContinueToNext] = useState(false);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? !hasLoadedRef.current;

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      await ensureStoreSeedData();
      const remap = await getStoreImportIdRemap();
      let todaysVisits = await getTodayVisits();
      todaysVisits = await normalizeTodayVisitsForStoreRemap(todaysVisits, remap);
      const pending =
        pendingAdvancement ?? (await getPendingVisitAdvancement());
      const routeDisplay = await resolveRouteDisplay(todaysVisits, pending, remap);

      setVisits(todaysVisits);
      setShowContinueToNext(
        phase === 'idle' &&
          pending !== null &&
          routeDisplay.current?.visit.status === 'completed' &&
          routeDisplay.next?.visit.status === 'pending',
      );

      const storeEntries = await Promise.all(
        todaysVisits.map(async (visit) => {
          const storeId = resolveRemappedStoreId(visit.storeId, remap);
          const store = await getStoreById(storeId);
          return store ? ([visit.storeId, store] as const) : null;
        }),
      );

      const nextStoresById: Record<string, Store> = {};

      for (const entry of storeEntries) {
        if (entry) {
          nextStoresById[entry[0]] = entry[1];
        }
      }

      const geocodedStoresById = await geocodeStoresForTodayVisits(todaysVisits);

      for (const [storeId, store] of Object.entries(geocodedStoresById)) {
        nextStoresById[storeId] = store;
      }

      const readableStoresById = await ensureReadableAddressesForStores(
        Object.values(nextStoresById),
      );

      for (const [storeId, store] of Object.entries(readableStoresById)) {
        nextStoresById[storeId] = store;
      }

      if (routeDisplay.current) {
        routeDisplay.current = {
          ...routeDisplay.current,
          store:
            readableStoresById[routeDisplay.current.store.id] ??
            routeDisplay.current.store,
        };
      }

      if (routeDisplay.next) {
        routeDisplay.next = {
          ...routeDisplay.next,
          store:
            readableStoresById[routeDisplay.next.store.id] ??
            routeDisplay.next.store,
        };
      }

      setStoresById(nextStoresById);
      setCurrent(routeDisplay.current);
      setNext(routeDisplay.next);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('[useTodayRoute] refresh failed:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [pendingAdvancement, phase]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    void refresh();
  }, [refresh, routeRefreshNonce]);

  const completedCount = countCompletedVisits(visits);
  const totalCount = visits.length;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    visits,
    storesById,
    current,
    next,
    completedCount,
    totalCount,
    progressPercent,
    isLoading,
    showContinueToNext,
    refresh,
  };
}
