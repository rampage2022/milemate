import type { RouteLocation } from '@/types/route-location';
import type { PlannedRouteEstimate, RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildPlannedRouteEstimate,
  formatDriveTime,
  formatEstimatedFinish,
  optimizeStopOrder,
  storeToOptimizableStop,
} from '@/utils/route-optimization';
import { getEffectiveEndLocation } from '@/services/route-planning';

export type DailyBriefingSummary = {
  dateHeading: string;
  startLabel: string;
  startAddress: string;
  endLabel: string;
  endAddress: string;
  stopCount: number;
  estimatedDistanceLabel: string;
  estimatedDriveTimeLabel: string;
  estimatedFinishLabel: string;
  firstStopName: string | null;
  lastStopName: string | null;
  estimateMethodNote: string;
};

function locationLabel(location: RouteLocation): string {
  return location.name?.trim() || location.formattedAddress.split('\n')[0];
}

function locationAddress(location: RouteLocation): string {
  if (location.name) {
    return location.formattedAddress.replace(/\n/g, ', ');
  }

  return location.formattedAddress.replace(/\n/g, ', ');
}

export function buildDailyBriefingSummary(input: {
  draft: RoutePlanningDraft;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
  dateHeading: string;
}): DailyBriefingSummary | null {
  if (!input.draft.startLocation || !input.draft.estimate) {
    return null;
  }

  const endLocation = getEffectiveEndLocation(input.draft);

  if (!endLocation) {
    return null;
  }

  const sorted = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return {
    dateHeading: input.dateHeading,
    startLabel: locationLabel(input.draft.startLocation),
    startAddress: locationAddress(input.draft.startLocation),
    endLabel: locationLabel(endLocation),
    endAddress: locationAddress(endLocation),
    stopCount: sorted.length,
    estimatedDistanceLabel: `${input.draft.estimate.distanceMiles.toFixed(1)} mi`,
    estimatedDriveTimeLabel: formatDriveTime(input.draft.estimate.driveTimeMinutes),
    estimatedFinishLabel: formatEstimatedFinish(input.draft.estimate.estimatedFinishAt),
    firstStopName: first ? input.storesById[first.storeId]?.name ?? null : null,
    lastStopName: last ? input.storesById[last.storeId]?.name ?? null : null,
    estimateMethodNote:
      'Approximate distance uses direct segments between verified locations.',
  };
}

export function resolveCoordinatorScreenMode(input: {
  isRestoring: boolean;
  isLoading: boolean;
  isWorkdayActive: boolean;
  isEditingRouteDuringWorkday?: boolean;
  visits: StoreVisit[];
  planningPhase: RoutePlanningDraft['phase'];
}): 'loading' | 'planning' | 'calculating' | 'briefing' | 'active_workday' | 'completed_day' {
  if (input.isRestoring || input.isLoading) {
    return 'loading';
  }

  if (
    input.isWorkdayActive &&
    input.isEditingRouteDuringWorkday &&
    input.planningPhase === 'planning'
  ) {
    return 'planning';
  }

  if (input.isWorkdayActive) {
    return 'active_workday';
  }

  const allFinished =
    input.visits.length > 0 &&
    input.visits.every(
      (visit) => visit.status === 'completed' || visit.status === 'skipped',
    );

  if (allFinished) {
    return 'completed_day';
  }

  if (input.planningPhase === 'calculating') {
    return 'calculating';
  }

  if (input.planningPhase === 'briefing') {
    return 'briefing';
  }

  return 'planning';
}

export function countVerifiedStops(
  visits: StoreVisit[],
  storesById: Record<string, Store>,
): number {
  return visits.filter((visit) => {
    const store = storesById[visit.storeId];

    return (
      typeof store?.latitude === 'number' &&
      typeof store?.longitude === 'number' &&
      Number.isFinite(store.latitude) &&
      Number.isFinite(store.longitude)
    );
  }).length;
}

export function buildPlanningPreviewEstimate(input: {
  draft: RoutePlanningDraft;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): PlannedRouteEstimate | null {
  if (input.draft.estimate && input.draft.phase !== 'planning') {
    return input.draft.estimate;
  }

  const startLocation = input.draft.startLocation;
  const endLocation = getEffectiveEndLocation(input.draft);

  if (!startLocation || !endLocation) {
    return null;
  }

  const optimizableStops = [...input.visits]
    .sort((left, right) => left.routeOrder - right.routeOrder)
    .map((visit) => {
      const store = input.storesById[visit.storeId];

      if (!store) {
        return null;
      }

      return storeToOptimizableStop(visit.id, store);
    })
    .filter((stop): stop is NonNullable<typeof stop> => stop !== null);

  if (optimizableStops.length === 0) {
    return null;
  }

  const orderedStops = optimizeStopOrder({
    start: startLocation,
    end: endLocation,
    stops: optimizableStops,
  });

  return buildPlannedRouteEstimate({
    start: startLocation,
    end: endLocation,
    orderedStops,
  });
}

export function formatPlanningDistanceLabel(
  estimate: PlannedRouteEstimate | null,
): string {
  if (!estimate) {
    return '— mi';
  }

  return `${estimate.distanceMiles.toFixed(1)} mi`;
}

export function formatPlanningTimeLabel(
  estimate: PlannedRouteEstimate | null,
): string {
  if (!estimate) {
    return '—';
  }

  return formatDriveTime(estimate.driveTimeMinutes);
}
