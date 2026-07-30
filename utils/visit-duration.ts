import { formatDurationDisplay } from '@/components/home/format-workday';
import type { StoreVisit } from '@/types/store-visit';

export function computeVisitDurationMs(visit: StoreVisit): number | null {
  if (
    typeof visit.visitDurationMs === 'number' &&
    Number.isFinite(visit.visitDurationMs)
  ) {
    return visit.visitDurationMs;
  }

  if (
    typeof visit.checkedInAt === 'number' &&
    typeof visit.completedAt === 'number' &&
    visit.completedAt >= visit.checkedInAt
  ) {
    return visit.completedAt - visit.checkedInAt;
  }

  return null;
}

export function formatVisitDurationLabel(visit: StoreVisit): string | null {
  const durationMs = computeVisitDurationMs(visit);

  if (durationMs === null) {
    return null;
  }

  return formatDurationDisplay(durationMs).value;
}

export function sumCompletedVisitDurationMs(visits: StoreVisit[]): number {
  return visits.reduce((total, visit) => {
    if (visit.status !== 'completed') {
      return total;
    }

    const duration = computeVisitDurationMs(visit);

    return duration === null ? total : total + duration;
  }, 0);
}

/** Mean of persisted `visitDurationMs` on completed visits only (no check-in fallback). */
export function averagePersistedCompletedVisitDurationMs(
  visits: StoreVisit[],
): number | null {
  const durations = visits
    .filter((visit) => visit.status === 'completed')
    .map((visit) => visit.visitDurationMs)
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0,
    );

  if (durations.length === 0) {
    return null;
  }

  const sum = durations.reduce((total, value) => total + value, 0);

  return sum / durations.length;
}

/** Route finish summary: whole minutes, no seconds. */
export function formatAverageVisitTimeSummary(durationMs: number): string {
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 1) {
    if (minutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
  }

  return `${totalMinutes} min`;
}

export const DEFAULT_PLANNED_VISIT_DURATION_MS = 20 * 60 * 1000;

export function averageCompletedVisitDurationMs(
  visits: StoreVisit[],
): number | null {
  const durations = visits
    .filter((visit) => visit.status === 'completed')
    .map((visit) => computeVisitDurationMs(visit))
    .filter((value): value is number => value !== null && value > 0);

  if (durations.length === 0) {
    return null;
  }

  return Math.round(
    durations.reduce((sum, value) => sum + value, 0) / durations.length,
  );
}
