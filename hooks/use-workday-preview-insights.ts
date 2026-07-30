import { useEffect, useState } from 'react';

import {
  loadWorkdayPreviewInsights,
  type WorkdayPreviewInsights,
} from '@/services/workday-preview-insights';

const EMPTY: WorkdayPreviewInsights = {
  deliveriesScheduledToday: 0,
  thingsToKnow: [],
};

export function useWorkdayPreviewInsights(routeStoreIds: string[]): {
  insights: WorkdayPreviewInsights;
  isLoading: boolean;
} {
  const storeKey = [...new Set(routeStoreIds)].sort().join('|');
  const [insights, setInsights] = useState<WorkdayPreviewInsights>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void loadWorkdayPreviewInsights({ routeStoreIds: storeKey.split('|').filter(Boolean) })
      .then((loaded) => {
        if (!cancelled) {
          setInsights(loaded);
        }
      })
      .catch((error) => {
        console.error('[useWorkdayPreviewInsights] load failed:', error);
        if (!cancelled) {
          setInsights(EMPTY);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  return { insights, isLoading };
}
