import type { RoutePlanningDraft } from '@/types/route-planning';
import type { StoreVisit } from '@/types/store-visit';

import {
  allVisitStopsFinished,
  hasVisitStops,
  isBlankRoute,
} from '@/utils/route-state';

export { allVisitStopsFinished as allVisitsFinished };

/** Top-level Route tab entry (New / Load / History) before route setup begins. */
export function shouldShowRouteEntryLauncher(input: {
  isAddingStopsDuringWorkday: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  isWorkdayActive: boolean;
  planningPhase: RoutePlanningDraft['phase'];
  routePlanningSessionOpen: boolean;
  visits: StoreVisit[];
}): boolean {
  if (input.isRestoring || input.isLoading) {
    return false;
  }

  if (input.isWorkdayActive) {
    return false;
  }

  if (input.isAddingStopsDuringWorkday) {
    return false;
  }

  if (input.planningPhase === 'calculating') {
    return false;
  }

  if (input.routePlanningSessionOpen) {
    return false;
  }

  if (input.planningPhase === 'briefing' && hasVisitStops(input.visits)) {
    return false;
  }

  if (hasVisitStops(input.visits) && !allVisitStopsFinished(input.visits)) {
    return false;
  }

  if (isBlankRoute(input.visits)) {
    return true;
  }

  return allVisitStopsFinished(input.visits);
}

/** @deprecated Use shouldShowRouteEntryLauncher */
export function shouldShowRouteLauncher(input: {
  isAddingStopsDuringWorkday: boolean;
  isCreatingRoute: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  isWorkdayActive: boolean;
  planningPhase: RoutePlanningDraft['phase'];
  visits: StoreVisit[];
}): boolean {
  return shouldShowRouteEntryLauncher({
    ...input,
    routePlanningSessionOpen: input.isCreatingRoute,
  });
}
