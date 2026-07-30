import type { StoreVisit } from '@/types/store-visit';

/** True once navigation has begun (first stop promoted or progress recorded). */
export function isTodayRouteStarted(visits: StoreVisit[]): boolean {
  return visits.some(
    (visit) =>
      visit.status === 'current' ||
      visit.status === 'checked_in' ||
      visit.status === 'completed',
  );
}
