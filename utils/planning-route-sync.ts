import { setTodayRouteSelection } from '@/services/today-route-selection';
import type { RouteLocation } from '@/types/route-location';
import { createCustomAddressEndpoint } from '@/types/route-endpoint';
import type { RoutePlanningDraft } from '@/types/route-planning';
import { getEffectiveEndLocation } from '@/services/route-planning';
import { getTodayDateString } from '@/utils/today-date';

function locationToEndpoint(location: RouteLocation) {
  return createCustomAddressEndpoint({
    label: location.name ?? location.formattedAddress.split('\n')[0],
    address: location.formattedAddress.replace(/\n/g, ', '),
    latitude: location.latitude,
    longitude: location.longitude,
  });
}

export async function syncPlanningDraftToTodayRouteSelection(
  draft: RoutePlanningDraft,
): Promise<void> {
  const endLocation = getEffectiveEndLocation(draft);

  await setTodayRouteSelection({
    dateKey: getTodayDateString(),
    startEndpoint: draft.startLocation ? locationToEndpoint(draft.startLocation) : null,
    endEndpoint: endLocation ? locationToEndpoint(endLocation) : null,
    returnToStart: draft.returnToStart,
    updatedAt: new Date().toISOString(),
  });
}

export async function buildActiveRouteContextFromPlanningDraft(
  draft: RoutePlanningDraft,
) {
  const endLocation = getEffectiveEndLocation(draft);

  return {
    startEndpointSnapshot: draft.startLocation
      ? {
          type: 'address' as const,
          label: draft.startLocation.name ?? 'Start',
          address: draft.startLocation.formattedAddress.replace(/\n/g, ', '),
          latitude: draft.startLocation.latitude,
          longitude: draft.startLocation.longitude,
        }
      : null,
    endEndpointSnapshot: endLocation
      ? {
          type: 'address' as const,
          label: endLocation.name ?? 'End',
          address: endLocation.formattedAddress.replace(/\n/g, ', '),
          latitude: endLocation.latitude,
          longitude: endLocation.longitude,
        }
      : null,
    returnToStart: draft.returnToStart,
  };
}
