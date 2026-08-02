import type { StoreVisit, StoreVisitStatus } from '@/types/store-visit';

export type VisitLogPrimaryActionMode =
  | 'check_in_and_skip'
  | 'finish_and_skip'
  | 'none';

export function resolveVisitLogPrimaryActionMode(
  status: StoreVisitStatus | undefined,
): VisitLogPrimaryActionMode {
  if (!status) {
    return 'none';
  }

  if (status === 'pending' || status === 'current') {
    return 'check_in_and_skip';
  }

  if (status === 'checked_in') {
    return 'finish_and_skip';
  }

  return 'none';
}

export function shouldShowVisitLogCheckedInStatus(status: StoreVisitStatus): boolean {
  return status === 'checked_in';
}

export function canUndoVisitLogCheckIn(visit: StoreVisit): boolean {
  return visit.status === 'checked_in';
}

export function isVisitLogActiveRouteStop(status: StoreVisitStatus | undefined): boolean {
  return (
    status === 'pending' ||
    status === 'current' ||
    status === 'checked_in'
  );
}
