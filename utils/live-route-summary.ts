import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { formatDurationDisplay } from '@/components/home/format-workday';
import { sumCompletedVisitDurationMs } from '@/utils/visit-duration';
import { distanceMiles } from '@/utils/distance';
import { formatDriveTime, formatEstimatedFinish } from '@/utils/route-optimization';

const AVERAGE_DRIVING_SPEED_MPH = 35;
const FINISH_ETA_UNAVAILABLE = '—';

export type LiveRouteSummaryCardData = {
  label: string;
  primaryValue: string;
  supportingValue: string;
};

export type LiveRouteProgressData = LiveRouteSummaryCardData & {
  progressRatio: number;
  ringValue: string;
  indicator: {
    accessibilityLabel: string;
    completedStops: number;
    currentStopIndex: number | null;
    totalStops: number;
  };
};

export function buildRouteProgressAccessibilityLabel(input: {
  completedStops: number;
  currentPosition: number;
  currentStopIndex: number | null;
  totalStops: number;
}): string {
  const base = `Route progress, ${input.currentPosition} of ${input.totalStops} stops`;

  if (input.currentStopIndex === null) {
    return `${base}, ${input.completedStops} completed.`;
  }

  return `${base}, ${input.completedStops} completed, stop ${input.currentStopIndex + 1} current.`;
}

export type LiveRouteSummaryData = {
  finishEta: LiveRouteSummaryCardData;
  nextStop: LiveRouteSummaryCardData;
  progress: LiveRouteProgressData;
};

export function estimateDriveMinutesBetweenCoordinates(
  from: { latitude: number; longitude: number } | undefined,
  to: { latitude: number; longitude: number } | undefined,
): number | null {
  if (
    !from ||
    !to ||
    !Number.isFinite(from.latitude) ||
    !Number.isFinite(from.longitude) ||
    !Number.isFinite(to.latitude) ||
    !Number.isFinite(to.longitude)
  ) {
    return null;
  }

  const miles = distanceMiles(
    { latitude: from.latitude, longitude: from.longitude },
    { latitude: to.latitude, longitude: to.longitude },
  );

  if (!Number.isFinite(miles) || miles <= 0) {
    return null;
  }

  return Math.max(1, Math.round((miles / AVERAGE_DRIVING_SPEED_MPH) * 60));
}

function estimateDriveMinutesBetweenStores(
  fromStore: Store | undefined,
  toStore: Store | undefined,
): number | null {
  if (!fromStore || !toStore) {
    return null;
  }

  return estimateDriveMinutesBetweenCoordinates(
    {
      latitude: fromStore.latitude ?? NaN,
      longitude: fromStore.longitude ?? NaN,
    },
    {
      latitude: toStore.latitude ?? NaN,
      longitude: toStore.longitude ?? NaN,
    },
  );
}

function stopDisplayTitle(store: Store | undefined): string {
  if (!store) {
    return 'Stop unavailable';
  }

  return formatPlanningStopDisplay(store).title;
}

function formatFinishEtaPrimary(estimatedFinishAt: string | null | undefined): string {
  if (!estimatedFinishAt) {
    return FINISH_ETA_UNAVAILABLE;
  }

  const finishDate = new Date(estimatedFinishAt);

  if (Number.isNaN(finishDate.getTime())) {
    return FINISH_ETA_UNAVAILABLE;
  }

  return formatEstimatedFinish(estimatedFinishAt);
}

export function buildLiveRouteSummaryData(input: {
  current: { visit: StoreVisit; store: Store } | null;
  estimatedFinishAt?: string | null;
  next: { visit: StoreVisit; store: Store } | null;
  totalCount: number;
  visits: StoreVisit[];
}): LiveRouteSummaryData {
  const sortedVisits = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );
  const currentIndex = input.current
    ? sortedVisits.findIndex((visit) => visit.id === input.current!.visit.id)
    : -1;
  const currentPosition =
    currentIndex >= 0 ? currentIndex + 1 : input.totalCount > 0 ? input.totalCount : 0;

  const progressPrimary =
    input.totalCount === 0
      ? '0 of 0'
      : input.current
        ? `${currentPosition} of ${input.totalCount}`
        : `${input.totalCount} of ${input.totalCount}`;

  const progressRingValue =
    input.totalCount === 0
      ? '0/0'
      : input.current
        ? `${currentPosition}/${input.totalCount}`
        : `${input.totalCount}/${input.totalCount}`;

  const progressRatio =
    input.totalCount > 0 ? Math.min(1, currentPosition / input.totalCount) : 0;

  const completedStops = sortedVisits.filter((visit) => visit.status === 'completed').length;
  const currentStopIndex = currentIndex >= 0 ? currentIndex : null;
  const completedVisitDurationMs = sumCompletedVisitDurationMs(sortedVisits);
  const progressSupportingValue =
    completedVisitDurationMs > 0
      ? formatDurationDisplay(completedVisitDurationMs).value
      : '';

  let nextStopPrimary = 'Route complete';
  let nextStopSupporting = '';

  if (input.next) {
    nextStopPrimary = stopDisplayTitle(input.next.store);
    const legMinutes = estimateDriveMinutesBetweenStores(
      input.current?.store,
      input.next.store,
    );
    nextStopSupporting = legMinutes !== null ? formatDriveTime(legMinutes) : '';
  } else if (input.totalCount > 0 && input.current) {
    nextStopPrimary = 'Final stop';
    nextStopSupporting = 'No further stops';
  }

  return {
    progress: {
      label: 'Progress',
      primaryValue: progressPrimary,
      progressRatio,
      ringValue: progressRingValue,
      supportingValue: progressSupportingValue,
      indicator: {
        accessibilityLabel: buildRouteProgressAccessibilityLabel({
          completedStops,
          currentPosition,
          currentStopIndex,
          totalStops: input.totalCount,
        }),
        completedStops,
        currentStopIndex,
        totalStops: input.totalCount,
      },
    },
    nextStop: {
      label: 'Next Stop',
      primaryValue: nextStopPrimary,
      supportingValue: nextStopSupporting,
    },
    finishEta: {
      label: 'Estimated Completion',
      primaryValue: formatFinishEtaPrimary(input.estimatedFinishAt),
      supportingValue: '',
    },
  };
}

export type LiveStopPresentationState = 'completed' | 'current' | 'upcoming' | 'skipped';

export function resolveLiveStopPresentationState(input: {
  currentVisitId: string | null;
  visit: StoreVisit;
}): LiveStopPresentationState {
  if (input.visit.status === 'completed') {
    return 'completed';
  }

  if (input.visit.status === 'skipped') {
    return 'skipped';
  }

  if (
    input.visit.id === input.currentVisitId ||
    input.visit.status === 'current' ||
    input.visit.status === 'checked_in'
  ) {
    return 'current';
  }

  return 'upcoming';
}
