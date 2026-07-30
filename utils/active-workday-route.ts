import type { ActiveWorkdayRouteContext } from '@/types/active-workday-route';
import type { RouteEndpoint } from '@/types/route-endpoint';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import { indexSavedLocationsById } from '@/utils/my-locations';
import {
  getEffectiveEndEndpoint,
  resolveEndpointForDisplay,
} from '@/utils/route-endpoints';

function snapshotFromDisplay(
  endpoint: RouteEndpoint,
  display: NonNullable<ReturnType<typeof resolveEndpointForDisplay>>,
): ActiveWorkdayRouteContext['startEndpointSnapshot'] {
  if (endpoint.type === 'current_location') {
    return {
      type: 'current_location',
      label: display.label,
      address: null,
      latitude: null,
      longitude: null,
    };
  }

  return {
    type: 'address',
    label: display.label,
    address: display.address,
    latitude: display.latitude,
    longitude: display.longitude,
  };
}

export function buildActiveWorkdayRouteContext(
  selection: TodayRouteSelection,
  locations: SavedLocation[],
): ActiveWorkdayRouteContext {
  const locationsById = indexSavedLocationsById(locations);
  const startEndpoint = selection.startEndpoint;
  const endEndpoint = getEffectiveEndEndpoint(selection);
  const startDisplay = resolveEndpointForDisplay(startEndpoint, locationsById);
  const endDisplay = resolveEndpointForDisplay(endEndpoint, locationsById);

  return {
    startEndpointSnapshot:
      startEndpoint && startDisplay?.isResolved
        ? snapshotFromDisplay(startEndpoint, startDisplay)
        : null,
    endEndpointSnapshot:
      endEndpoint && endDisplay?.isResolved
        ? snapshotFromDisplay(endEndpoint, endDisplay)
        : null,
    returnToStart: selection.returnToStart,
  };
}
