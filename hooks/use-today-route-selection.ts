import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  getTodayRouteSelection,
  setTodayRouteSelection,
  updateTodayRouteEndpoint,
  updateTodayRouteReturnToStart,
} from '@/services/today-route-selection';
import type { RouteEndpoint } from '@/types/route-endpoint';
import {
  createEmptyTodayRouteSelection,
  type TodayRouteSelection,
} from '@/types/today-route-selection';
import { getTodayDateString } from '@/utils/today-date';

export function useTodayRouteSelection() {
  const [selection, setSelection] = useState<TodayRouteSelection>(
    createEmptyTodayRouteSelection(getTodayDateString()),
  );
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const loaded = await getTodayRouteSelection();
      setSelection(loaded);
    } catch (error) {
      console.error('[useTodayRouteSelection] load failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSelection = useCallback(async (nextSelection: TodayRouteSelection) => {
    setSelection(nextSelection);
    await setTodayRouteSelection(nextSelection);
  }, []);

  const setStartEndpoint = useCallback(async (endpoint: RouteEndpoint | null) => {
    const next = await updateTodayRouteEndpoint({ role: 'start', endpoint });
    setSelection(next);
    return next;
  }, []);

  const setEndEndpoint = useCallback(async (endpoint: RouteEndpoint | null) => {
    const next = await updateTodayRouteEndpoint({ role: 'end', endpoint });
    setSelection(next);
    return next;
  }, []);

  const setReturnToStart = useCallback(async (enabled: boolean) => {
    const next = await updateTodayRouteReturnToStart(enabled);
    setSelection(next);
    return next;
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    selection,
    isLoading,
    refresh,
    saveSelection,
    setStartEndpoint,
    setEndEndpoint,
    setReturnToStart,
  };
}
