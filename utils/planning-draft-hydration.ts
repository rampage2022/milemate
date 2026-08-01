import { getTodayRouteSelection } from '@/services/today-route-selection';
import {
  getRoutePlanningDraft,
  setRoutePlanningDraft,
  updateRoutePlanningLocations,
} from '@/services/route-planning';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { SavedLocation } from '@/types/saved-location';
import { resolveAuthoritativePlanningStartLocation } from '@/utils/authoritative-start-location';

export async function hydratePlanningDraftFromTodaySelection(input: {
  draft: RoutePlanningDraft;
  myLocations: SavedLocation[];
}): Promise<RoutePlanningDraft> {
  const authoritativeStart = resolveAuthoritativePlanningStartLocation({
    myLocations: input.myLocations,
    planningStartLocation: input.draft.startLocation,
    todayRouteSelection: await getTodayRouteSelection(input.draft.dateKey),
  });

  if (!authoritativeStart) {
    return input.draft;
  }

  if (
    input.draft.startLocation &&
    input.draft.startLocation.formattedAddress.trim().length > 0
  ) {
    return input.draft;
  }

  return updateRoutePlanningLocations({
    startLocation: authoritativeStart,
  });
}

export async function loadHydratedRoutePlanningDraft(input: {
  myLocations: SavedLocation[];
}): Promise<RoutePlanningDraft> {
  const draft = await getRoutePlanningDraft();

  return hydratePlanningDraftFromTodaySelection({
    draft,
    myLocations: input.myLocations,
  });
}

export async function persistHydratedPlanningDraftIfNeeded(input: {
  draft: RoutePlanningDraft;
  myLocations: SavedLocation[];
}): Promise<RoutePlanningDraft> {
  const hydrated = await hydratePlanningDraftFromTodaySelection(input);

  if (hydrated !== input.draft && hydrated.startLocation) {
    await setRoutePlanningDraft(hydrated);
  }

  return hydrated;
}
