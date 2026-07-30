import {
  sanitizeLatitude,
  sanitizeLongitude,
} from '@/utils/my-locations';

export type RouteEndpoint =
  | {
      type: 'current_location';
      label: 'Current Location';
    }
  | {
      type: 'saved_location';
      savedLocationId: string;
    }
  | {
      type: 'custom_address';
      label: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
    };

export const CURRENT_LOCATION_LABEL = 'Current Location' as const;

export function createCurrentLocationEndpoint(): RouteEndpoint {
  return {
    type: 'current_location',
    label: CURRENT_LOCATION_LABEL,
  };
}

export function createSavedLocationEndpoint(savedLocationId: string): RouteEndpoint {
  return {
    type: 'saved_location',
    savedLocationId,
  };
}


export function createCustomAddressEndpoint(input: {
  label: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}): RouteEndpoint {
  return {
    type: 'custom_address',
    label: input.label.trim(),
    address: input.address.trim(),
    latitude:
      input.latitude === undefined || input.latitude === null
        ? null
        : sanitizeLatitude(input.latitude),
    longitude:
      input.longitude === undefined || input.longitude === null
        ? null
        : sanitizeLongitude(input.longitude),
  };
}
