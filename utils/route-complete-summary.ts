import { formatDurationDisplay } from '@/components/home/format-workday';
import type { RouteCompleteRecord } from '@/types/route-complete-record';
import type { StoreVisit } from '@/types/store-visit';
import {
  countRouteStopOutcomes,
  resolveRouteCompletionHeadline,
  type RouteStopOutcomeCounts,
} from '@/utils/route-resolution';
import {
  averagePersistedCompletedVisitDurationMs,
  formatAverageVisitTimeSummary,
} from '@/utils/visit-duration';

export type RouteCompleteMetricCell = {
  id: string;
  label: string;
  value: string;
};

export type RouteCompleteAchievement = {
  primaryLine: string;
  secondaryLine: string | null;
  useOutcomeCounts: boolean;
};

export type RouteCompleteSummaryPresentation = {
  achievement: RouteCompleteAchievement;
  encouragement: string;
  metrics: RouteCompleteMetricCell[];
  outcomes: RouteStopOutcomeCounts;
  routeCompletedAtMs: number;
  routeDurationMs: number | null;
  title: string;
};

const NOT_RECORDED = 'Not recorded';
const AVERAGE_VISIT_TIME_UNAVAILABLE = '—';

function formatMiles(distanceMiles: number | null, mileageAvailable: boolean): string {
  if (!mileageAvailable || distanceMiles === null || !Number.isFinite(distanceMiles)) {
    return NOT_RECORDED;
  }

  return `${distanceMiles.toFixed(1)} mi`;
}

function formatRouteDurationMs(durationMs: number | null): string {
  if (durationMs === null || durationMs <= 0) {
    return NOT_RECORDED;
  }

  return formatDurationDisplay(durationMs).value;
}

function formatAverageVisitTime(visits: StoreVisit[]): string {
  const averageMs = averagePersistedCompletedVisitDurationMs(visits);

  if (averageMs === null || averageMs <= 0) {
    return AVERAGE_VISIT_TIME_UNAVAILABLE;
  }

  return formatAverageVisitTimeSummary(averageMs);
}

function buildAchievement(outcomes: RouteStopOutcomeCounts): RouteCompleteAchievement {
  const { completed, skipped, totalScheduled } = outcomes;

  if (skipped > 0 || completed < totalScheduled) {
    return {
      primaryLine: '',
      secondaryLine: `${totalScheduled} scheduled stops`,
      useOutcomeCounts: true,
    };
  }

  return {
    primaryLine: `${completed} of ${totalScheduled}`,
    secondaryLine: 'Stops Completed',
    useOutcomeCounts: false,
  };
}

function resolveRouteDurationMs(record: RouteCompleteRecord): number | null {
  if (record.routeStartedAtMs === null) {
    return null;
  }

  const durationMs = record.routeCompletedAtMs - record.routeStartedAtMs;

  return durationMs > 0 ? durationMs : null;
}

/** Pure presentation derived from a persisted route-complete record. */
export function buildRouteCompleteSummaryPresentationFromRecord(
  record: RouteCompleteRecord,
): RouteCompleteSummaryPresentation {
  const outcomes = countRouteStopOutcomes(record.visits);
  const headline = resolveRouteCompletionHeadline({
    hasScheduledStops: outcomes.totalScheduled > 0,
    outcomes,
  });
  const achievement = buildAchievement(outcomes);
  const routeDurationMs = resolveRouteDurationMs(record);

  const metrics: RouteCompleteMetricCell[] = [
    {
      id: 'miles',
      label: 'Miles',
      value: formatMiles(record.distanceMiles, record.mileageTrackingAvailable),
    },
    {
      id: 'route-duration',
      label: 'Route Time',
      value: formatRouteDurationMs(routeDurationMs),
    },
    {
      id: 'visit-time',
      label: 'Average Visit Time',
      value: formatAverageVisitTime(record.visits),
    },
    {
      id: 'orders',
      label: 'Orders Logged',
      value: `${record.ordersLoggedCount}`,
    },
  ];

  return {
    achievement,
    encouragement: headline.encouragement,
    metrics,
    outcomes,
    routeCompletedAtMs: record.routeCompletedAtMs,
    routeDurationMs,
    title: headline.title,
  };
}

export function formatRouteCompletionTime(timestampMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestampMs));
}
