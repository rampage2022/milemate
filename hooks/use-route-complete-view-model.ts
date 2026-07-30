import { useCallback, useEffect, useState } from 'react';

import { useVisitAdvancement } from '@/contexts/visit-advancement-context';
import { loadRouteCompleteRecord } from '@/services/route-complete-record';
import type { RouteCompleteRecord } from '@/types/route-complete-record';
import { buildRouteCompleteSummaryPresentationFromRecord } from '@/utils/route-complete-summary';
import type { RouteCompleteSummaryPresentation } from '@/utils/route-complete-summary';
import { buildRouteCompleteMapModelFromRecord } from '@/utils/route-experience-map-model';
import type { RouteExperienceMapModel } from '@/utils/route-experience-map-model';

export type RouteCompleteViewModel = {
  mapModel: RouteExperienceMapModel | null;
  presentation: RouteCompleteSummaryPresentation;
  record: RouteCompleteRecord;
};

export function useRouteCompleteViewModel(enabled: boolean): {
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
  viewModel: RouteCompleteViewModel | null;
} {
  const { routeRefreshNonce } = useVisitAdvancement();
  const [viewModel, setViewModel] = useState<RouteCompleteViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setViewModel(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const record = await loadRouteCompleteRecord();

      if (!record) {
        setViewModel(null);
        setError('Route completion data is not available yet.');
        return;
      }

      setViewModel({
        record,
        presentation: buildRouteCompleteSummaryPresentationFromRecord(record),
        mapModel: buildRouteCompleteMapModelFromRecord(record),
      });
    } catch (loadError) {
      console.error('[useRouteCompleteViewModel] load failed:', loadError);
      setViewModel(null);
      setError('Could not load the route completion summary.');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [enabled, reload, routeRefreshNonce]);

  return {
    error,
    isLoading,
    reload,
    viewModel,
  };
}
