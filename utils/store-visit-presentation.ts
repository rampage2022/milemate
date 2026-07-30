import type { StoreVisit } from '@/types/store-visit';

import { formatVisitCompletionTime } from '@/utils/coordinator-screen-presentation';

export function resolveLastCompletedVisitForDisplay(
  visits: StoreVisit[],
  storeId: string,
  activeVisit: StoreVisit | null,
): StoreVisit | null {
  const excludeVisitId =
    activeVisit &&
    activeVisit.status !== 'completed' &&
    activeVisit.status !== 'skipped'
      ? activeVisit.id
      : null;

  return (
    visits
      .filter(
        (visit) =>
          visit.storeId === storeId &&
          visit.status === 'completed' &&
          typeof visit.completedAt === 'number' &&
          visit.id !== excludeVisitId,
      )
      .sort((left, right) => right.completedAt! - left.completedAt!)[0] ?? null
  );
}

export function formatVisitDateLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

export function formatRelativeVisitAge(completedAt: number): string | null {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const completedDay = new Date(completedAt);
  completedDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (startOfToday.getTime() - completedDay.getTime()) / 86_400_000,
  );

  if (diffDays <= 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays <= 45) {
    return `${diffDays} days ago`;
  }

  return null;
}

export function formatCheckInTimeLabel(checkedInAt: number | undefined): string | null {
  return formatVisitCompletionTime(checkedInAt);
}

export function formatCompletionTimeLabel(completedAt: number | undefined): string | null {
  return formatVisitCompletionTime(completedAt);
}
