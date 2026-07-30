import { getEffectiveEndLocation } from '@/services/route-planning';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildBriefingRouteMapModel,
  type BriefingRouteMapModel,
} from '@/utils/briefing-route-map-model';
import { estimateDriveMinutesBetweenCoordinates } from '@/utils/live-route-summary';
import {
  countVerifiedStops,
  type DailyBriefingSummary,
} from '@/utils/planned-route-briefing';
import { formatDriveTime } from '@/utils/route-optimization';

export type BriefingRouteHealth =
  | { status: 'verified' }
  | { status: 'needs_review'; count: number };

export type BriefingPresentation = {
  routeHealth: BriefingRouteHealth | null;
  routeMap: BriefingRouteMapModel | null;
  firstStopDriveTimeLabel: string | null;
  endpointsAreSame: boolean;
};

export function buildBriefingPresentation(input: {
  draft: RoutePlanningDraft;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
  summary: DailyBriefingSummary;
}): BriefingPresentation {
  const totalStops = input.visits.length;
  const verifiedStopCount = countVerifiedStops(input.visits, input.storesById);

  let routeHealth: BriefingRouteHealth | null = null;

  if (totalStops > 0) {
    if (verifiedStopCount >= totalStops) {
      routeHealth = { status: 'verified' };
    } else {
      routeHealth = {
        status: 'needs_review',
        count: totalStops - verifiedStopCount,
      };
    }
  }

  const routeMap = buildBriefingRouteMapModel({
    draft: input.draft,
    visits: input.visits,
    storesById: input.storesById,
  });

  const sorted = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );
  const firstVisit = sorted[0];
  const firstStore = firstVisit
    ? input.storesById[firstVisit.storeId]
    : undefined;
  const start = input.draft.startLocation;

  let firstStopDriveTimeLabel: string | null = null;

  if (start && firstStore) {
    const minutes = estimateDriveMinutesBetweenCoordinates(
      { latitude: start.latitude, longitude: start.longitude },
      {
        latitude: firstStore.latitude ?? NaN,
        longitude: firstStore.longitude ?? NaN,
      },
    );

    if (minutes !== null) {
      firstStopDriveTimeLabel = formatDriveTime(minutes);
    }
  }

  const end = getEffectiveEndLocation(input.draft);
  const endpointsAreSame =
    input.draft.returnToStart === true ||
    (start &&
      end &&
      start.latitude === end.latitude &&
      start.longitude === end.longitude) ||
    input.summary.startAddress === input.summary.endAddress;

  return {
    routeHealth,
    routeMap,
    firstStopDriveTimeLabel,
    endpointsAreSame,
  };
}
