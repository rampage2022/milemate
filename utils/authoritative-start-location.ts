import type { RouteLocation } from '@/types/route-location';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import { routeLocationFromConfirmation } from '@/services/route-planning';
import { indexSavedLocationsById } from '@/utils/my-locations';
import { resolveEndpointForDisplay } from '@/utils/route-endpoints';

export function routeLocationFromTodayRouteStartEndpoint(input: {
  endpoint: TodayRouteSelection['startEndpoint'];
  myLocations: SavedLocation[];
}): RouteLocation | null {
  if (!input.endpoint) {
    return null;
  }

  const locationsById = indexSavedLocationsById(input.myLocations);
  const display = resolveEndpointForDisplay(input.endpoint, locationsById);

  if (!display || !display.isResolved) {
    return null;
  }

  if (
    display.latitude === null ||
    display.longitude === null ||
    !Number.isFinite(display.latitude) ||
    !Number.isFinite(display.longitude)
  ) {
    return null;
  }

  const address =
    display.address?.trim() ||
    display.label.trim();

  if (address.length === 0) {
    return null;
  }

  return routeLocationFromConfirmation({
    formattedAddress: address,
    latitude: display.latitude,
    longitude: display.longitude,
    name: display.label.trim() || undefined,
    source: 'profile',
  });
}

export function resolveAuthoritativePlanningStartLocation(input: {
  myLocations: SavedLocation[];
  planningStartLocation: RouteLocation | null;
  todayRouteSelection: TodayRouteSelection;
}): RouteLocation | null {
  if (input.planningStartLocation) {
    const formatted = input.planningStartLocation.formattedAddress.trim();

    if (formatted.length > 0) {
      return input.planningStartLocation;
    }
  }

  return routeLocationFromTodayRouteStartEndpoint({
    endpoint: input.todayRouteSelection.startEndpoint,
    myLocations: input.myLocations,
  });
}
