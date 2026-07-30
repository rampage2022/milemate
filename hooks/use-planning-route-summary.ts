import { useMemo } from 'react';

import { isRoutePlanningReadyToCalculate } from '@/services/route-planning';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

import { hasVisitStops } from '@/utils/route-state';
import {
  buildPlanningPreviewEstimate,
  countVerifiedStops,
  formatPlanningDistanceLabel,
  formatPlanningTimeLabel,
} from '@/utils/planned-route-briefing';
import { describeRoutePlanningBlocker } from '@/utils/route-planning-blocker';

export function usePlanningRouteSummary(input: {
  draft: RoutePlanningDraft;
  isCalculating: boolean;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
}) {
  const hasStops = hasVisitStops(input.visits);
  const verifiedStopCount = useMemo(
    () => countVerifiedStops(input.visits, input.storesById),
    [input.storesById, input.visits],
  );
  const previewEstimate = useMemo(
    () =>
      buildPlanningPreviewEstimate({
        draft: input.draft,
        visits: input.visits,
        storesById: input.storesById,
      }),
    [input.draft, input.storesById, input.visits],
  );
  const canCalculate =
    isRoutePlanningReadyToCalculate(input.draft, {
      totalStopCount: input.visits.length,
      verifiedStopCount,
    }) && !input.isCalculating;
  const blockerMessage =
    canCalculate || !hasStops
      ? null
      : describeRoutePlanningBlocker({
          draft: input.draft,
          totalStopCount: input.visits.length,
          verifiedStopCount,
        });

  const distanceLabel = formatPlanningDistanceLabel(previewEstimate);
  const timeLabel = formatPlanningTimeLabel(previewEstimate);
  const stopsLabel = hasStops
    ? `${input.visits.length} ${input.visits.length === 1 ? 'stop' : 'stops'}`
    : '0 stops';

  return {
    blockerMessage,
    canCalculate,
    distanceLabel,
    hasStops,
    stopsLabel,
    timeLabel,
  };
}
