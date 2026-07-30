import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  getRoutePlanningDraft,
  resetRoutePlanningToPlanningPhase,
  saveRoutePlanningResult,
  setRoutePlanningDraft,
  updateRoutePlanningLocations,
  updateRoutePlanningPhase,
} from '@/services/route-planning';
import type { RouteLocation } from '@/types/route-location';
import type { RoutePlanningDraft } from '@/types/route-planning';
import { getTodayDateString } from '@/utils/today-date';

function createInitialDraft(): RoutePlanningDraft {
  return {
    dateKey: getTodayDateString(),
    phase: 'planning',
    startLocation: null,
    endLocation: null,
    returnToStart: true,
    estimate: null,
    drivingPolyline: null,
    calculatedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function useRoutePlanning() {
  const [draft, setDraft] = useState<RoutePlanningDraft>(createInitialDraft());
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? !hasLoadedRef.current;

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const loaded = await getRoutePlanningDraft();
      setDraft(loaded);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('[useRoutePlanning] load failed:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  const setPhase = useCallback(async (phase: RoutePlanningDraft['phase']) => {
    const next = await updateRoutePlanningPhase(phase);
    setDraft(next);
    return next;
  }, []);

  const updateLocations = useCallback(
    async (input: {
      startLocation?: RouteLocation | null;
      endLocation?: RouteLocation | null;
      returnToStart?: boolean;
    }) => {
      const next = await updateRoutePlanningLocations(input);
      setDraft(next);
      return next;
    },
    [],
  );

  const completeCalculation = useCallback(
    async (input: Parameters<typeof saveRoutePlanningResult>[0]) => {
      const next = await saveRoutePlanningResult(input);
      setDraft(next);
      return next;
    },
    [],
  );

  const backToPlanning = useCallback(async () => {
    const next = await resetRoutePlanningToPlanningPhase();
    setDraft(next);
    return next;
  }, []);

  const replaceDraft = useCallback(async (nextDraft: RoutePlanningDraft) => {
    await setRoutePlanningDraft(nextDraft);
    setDraft(nextDraft);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    draft,
    isLoading,
    refresh,
    setPhase,
    updateLocations,
    completeCalculation,
    backToPlanning,
    replaceDraft,
  };
}
