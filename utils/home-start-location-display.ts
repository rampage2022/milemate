import type { RouteLocation } from '@/types/route-location';
import type { SavedLocation } from '@/types/saved-location';

export type HomeStartLocationDisplay = {
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  name: string | null;
  ready: boolean;
};

function normalizeAddressLine(value: string): string {
  return value.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
}

function savedLocationCoordinates(location: SavedLocation): {
  latitude: number | null;
  longitude: number | null;
} {
  if (
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  ) {
    return {
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  return { latitude: null, longitude: null };
}

/** Matches Profile “Default Start Location”: planning draft first, then saved My Locations. */
export function resolveHomeStartLocationDisplay(input: {
  myLocations: SavedLocation[];
  planningStartLocation: RouteLocation | null;
}): HomeStartLocationDisplay {
  if (input.planningStartLocation) {
    const addressLine = normalizeAddressLine(input.planningStartLocation.formattedAddress);

    if (addressLine.length > 0) {
      return {
        addressLine,
        latitude: input.planningStartLocation.latitude,
        longitude: input.planningStartLocation.longitude,
        name: input.planningStartLocation.name?.trim() ?? null,
        ready: true,
      };
    }
  }

  for (const location of input.myLocations) {
    const addressLine = normalizeAddressLine(location.address);

    if (addressLine.length === 0) {
      continue;
    }

    const coordinates = savedLocationCoordinates(location);

    return {
      addressLine,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      name: location.label.trim() || null,
      ready: true,
    };
  }

  return {
    addressLine: '',
    latitude: null,
    longitude: null,
    name: null,
    ready: false,
  };
}
