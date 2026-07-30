import { useEffect, useMemo, useState } from 'react';

import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { buildDynamicEstimatedFinishAt } from '@/utils/dynamic-estimated-finish';

const REFRESH_INTERVAL_MS = 60_000;

export function useDynamicEstimatedFinishAt(input: {
  enabled: boolean;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
  currentVisit: StoreVisit | null;
  endStore: Store | null;
}): string | null {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!input.enabled) {
      return;
    }

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [input.enabled, input.visits, input.currentVisit?.id]);

  return useMemo(() => {
    if (!input.enabled) {
      return null;
    }

    return buildDynamicEstimatedFinishAt({
      nowMs,
      visits: input.visits,
      storesById: input.storesById,
      currentVisit: input.currentVisit,
      endStore: input.endStore,
    });
  }, [
    input.currentVisit,
    input.enabled,
    input.endStore,
    input.storesById,
    input.visits,
    nowMs,
  ]);
}
