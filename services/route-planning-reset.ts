import {
  getRoutePlanningDraft,
  setRoutePlanningDraft,
} from '@/services/route-planning';
import { resolveDefaultPlanningStartLocation } from '@/services/planning-start-location';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { SavedLocation } from '@/types/saved-location';
import { getTodayDateString } from '@/utils/today-date';

function createFreshPlanningDraft(): RoutePlanningDraft {
  return {
    dateKey: getTodayDateString(),
    phase: 'planning',
    startLocation: null,
    endLocation: null,
    returnToStart: true,
    estimate: null,
    drivingPolyline: null,
    calculatedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Clears route-scoped draft fields and reapplies Settings defaults (does not mutate Saved Locations). */
export async function resetRoutePlanningForNewRoute(input: {
  myLocations: SavedLocation[];
}): Promise<RoutePlanningDraft> {
  const startLocation = await resolveDefaultPlanningStartLocation({
    myLocations: input.myLocations,
  });

  const next: RoutePlanningDraft = {
    ...createFreshPlanningDraft(),
    startLocation,
    endLocation: null,
    returnToStart: true,
  };

  await setRoutePlanningDraft(next);

  return next;
}

/** Clears calculated results while keeping current endpoint selections. */
export async function clearRoutePlanningCalculations(): Promise<RoutePlanningDraft> {
  const current = await getRoutePlanningDraft();
  const next: RoutePlanningDraft = {
    ...current,
    phase: 'planning',
    estimate: null,
    drivingPolyline: null,
    calculatedAt: null,
    updatedAt: new Date().toISOString(),
  };

  await setRoutePlanningDraft(next);

  return next;
}
