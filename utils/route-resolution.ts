import type { StoreVisit } from '@/types/store-visit';

export type RouteStopOutcomeCounts = {
  completed: number;
  skipped: number;
  totalScheduled: number;
  unresolved: number;
};

const TERMINAL_STATUSES = new Set<StoreVisit['status']>(['completed', 'skipped']);

export function isTerminalRouteStopStatus(status: StoreVisit['status']): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Every scheduled stop is completed or skipped (removed stops are not in the list). */
export function isRouteFullyResolved(visits: StoreVisit[]): boolean {
  if (visits.length === 0) {
    return false;
  }

  return visits.every((visit) => isTerminalRouteStopStatus(visit.status));
}

export function countRouteStopOutcomes(visits: StoreVisit[]): RouteStopOutcomeCounts {
  let completed = 0;
  let skipped = 0;
  let unresolved = 0;

  for (const visit of visits) {
    if (visit.status === 'completed') {
      completed += 1;
      continue;
    }

    if (visit.status === 'skipped') {
      skipped += 1;
      continue;
    }

    unresolved += 1;
  }

  return {
    completed,
    skipped,
    totalScheduled: visits.length,
    unresolved,
  };
}

export function visitHasRemainingRouteWork(
  visits: StoreVisit[],
  afterRouteOrder: number,
): boolean {
  return visits.some(
    (visit) =>
      visit.routeOrder > afterRouteOrder && !isTerminalRouteStopStatus(visit.status),
  );
}

export type RouteCompletionHeadline = {
  encouragement: string;
  title: 'Route Complete' | 'Route Finished' | 'Workday Complete';
};

export function resolveRouteCompletionHeadline(input: {
  outcomes: RouteStopOutcomeCounts;
  hasScheduledStops: boolean;
}): RouteCompletionHeadline {
  const { completed, skipped, totalScheduled, unresolved } = input.outcomes;

  if (!input.hasScheduledStops || totalScheduled === 0) {
    return {
      title: 'Workday Complete',
      encouragement: 'Nice work. Your workday is ready to wrap up.',
    };
  }

  if (unresolved > 0) {
    return {
      title: 'Route Finished',
      encouragement: 'Nice work. Today’s route has been wrapped up.',
    };
  }

  if (skipped > 0) {
    return {
      title: 'Route Finished',
      encouragement: 'Nice work. Today’s route has been wrapped up.',
    };
  }

  if (completed === totalScheduled) {
    return {
      title: 'Route Complete',
      encouragement: 'Nice work. Every scheduled stop is complete.',
    };
  }

  return {
    title: 'Route Finished',
    encouragement: 'Nice work. Today’s route has been wrapped up.',
  };
}
