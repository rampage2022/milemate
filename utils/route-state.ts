import { getEffectiveEndLocation } from '@/services/route-planning';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { RouteLocation } from '@/types/route-location';
import type { StoreVisit } from '@/types/store-visit';

/** Visit stops only — never includes Start/Finish endpoints. */
export function getVisitStops(visits: StoreVisit[]): StoreVisit[] {
  return visits;
}

export function hasVisitStops(visits: StoreVisit[]): boolean {
  return getVisitStops(visits).length > 0;
}

export function isBlankRoute(visits: StoreVisit[]): boolean {
  return !hasVisitStops(visits);
}

export function getStartLocation(draft: RoutePlanningDraft): RouteLocation | null {
  return draft.startLocation;
}

export function getFinishLocation(draft: RoutePlanningDraft): RouteLocation | null {
  return getEffectiveEndLocation(draft);
}

export function allVisitStopsFinished(visits: StoreVisit[]): boolean {
  return (
    hasVisitStops(visits) &&
    visits.every(
      (visit) => visit.status === 'completed' || visit.status === 'skipped',
    )
  );
}
