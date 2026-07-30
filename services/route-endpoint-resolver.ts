import { getMyLocationById } from '@/services/my-locations';
import type { OneTimeLocationResult } from '@/services/location';
import type { RouteEndpoint } from '@/types/route-endpoint';
import { isCurrentLocationEndpoint } from '@/utils/route-endpoints';

export type RouteEndpointResolution =
  | {
      status: 'resolved';
      latitude: number;
      longitude: number;
      fromCache: boolean;
    }
  | {
      status: 'address_coordinates';
      latitude: number;
      longitude: number;
    }
  | {
      status: 'address_without_coordinates';
    }
  | {
      status: 'permission_denied';
    }
  | {
      status: 'unavailable';
    };

export type LocationFixProvider = () => Promise<OneTimeLocationResult>;

let locationFixProvider: LocationFixProvider = async () => {
  const { getOneTimeLocationFix } = await import('@/services/location');
  const { getLastAccumulatorPosition } = await import(
    '@/services/workday-distance-accumulator'
  );

  return getOneTimeLocationFix({
    preferAccumulatorPosition: getLastAccumulatorPosition,
  });
};

/** @internal Allows tests to stub live location resolution. */
export function __setLocationFixProviderForTests(
  provider: LocationFixProvider | null,
): void {
  locationFixProvider =
    provider ??
    (async () => {
      const { getOneTimeLocationFix } = await import('@/services/location');
      const { getLastAccumulatorPosition } = await import(
        '@/services/workday-distance-accumulator'
      );

      return getOneTimeLocationFix({
        preferAccumulatorPosition: getLastAccumulatorPosition,
      });
    });
}

async function resolveAddressCoordinates(
  latitude: number | null,
  longitude: number | null,
): Promise<RouteEndpointResolution> {
  if (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return {
      status: 'address_coordinates',
      latitude,
      longitude,
    };
  }

  return {
    status: 'address_without_coordinates',
  };
}

export async function resolveRouteEndpointCoordinates(
  endpoint: RouteEndpoint,
): Promise<RouteEndpointResolution> {
  if (isCurrentLocationEndpoint(endpoint)) {
    const result = await locationFixProvider();

    if (!result.ok) {
      return {
        status: result.reason,
      };
    }

    return {
      status: 'resolved',
      latitude: result.update.latitude,
      longitude: result.update.longitude,
      fromCache: result.fromCache,
    };
  }

  if (endpoint.type === 'custom_address') {
    return resolveAddressCoordinates(endpoint.latitude, endpoint.longitude);
  }

  if (endpoint.type === 'saved_location') {
    const saved = await getMyLocationById(endpoint.savedLocationId);

    if (!saved) {
      return {
        status: 'unavailable',
      };
    }

    return resolveAddressCoordinates(saved.latitude, saved.longitude);
  }

  return {
    status: 'unavailable',
  };
}

export async function resolveCurrentLocationEndpoint(): Promise<RouteEndpointResolution> {
  return resolveRouteEndpointCoordinates({
    type: 'current_location',
    label: 'Current Location',
  });
}
