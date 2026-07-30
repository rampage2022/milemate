import { reverseGeocodeForConfirmation } from '@/services/address-geocoding';
import {
  getOneTimeLocationFix,
  requestForegroundPermission,
} from '@/services/location';
import { routeLocationFromMyLocation } from '@/services/route-calculation';
import { routeLocationFromConfirmation } from '@/services/route-planning';
import type { RouteLocation } from '@/types/route-location';
import type { SavedLocation } from '@/types/saved-location';

export async function resolveDefaultPlanningStartLocation(input: {
  myLocations: SavedLocation[];
}): Promise<RouteLocation | null> {
  const profileLocation = input.myLocations
    .map((location) => routeLocationFromMyLocation(location))
    .find((location) => location !== null);

  if (profileLocation) {
    return profileLocation;
  }

  const permission = await requestForegroundPermission();

  if (!permission.granted) {
    return null;
  }

  const fix = await getOneTimeLocationFix();

  if (!fix.ok) {
    return null;
  }

  const confirmed = await reverseGeocodeForConfirmation({
    latitude: fix.update.latitude,
    longitude: fix.update.longitude,
    fallbackAddress: 'Current Location',
  });

  return routeLocationFromConfirmation({
    name: confirmed.name,
    formattedAddress: confirmed.formattedAddress,
    latitude: confirmed.latitude,
    longitude: confirmed.longitude,
    source: 'current-location',
  });
}

export async function resolveCurrentLocationPlanningStart(): Promise<RouteLocation | null> {
  return resolveDefaultPlanningStartLocation({ myLocations: [] });
}
