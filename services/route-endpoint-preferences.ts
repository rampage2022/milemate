import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RouteEndpoint } from '@/types/route-endpoint';
import { createCurrentLocationEndpoint } from '@/types/route-endpoint';
import { sanitizeRouteEndpoint } from '@/utils/route-endpoints';

export type RouteEndpointPreferences = {
  startLocation: RouteEndpoint | null;
  endLocation: RouteEndpoint | null;
  startAndEndSameLocation: boolean;
};

export const DEFAULT_ROUTE_ENDPOINT_PREFERENCES: RouteEndpointPreferences = {
  startLocation: createCurrentLocationEndpoint(),
  endLocation: null,
  startAndEndSameLocation: true,
};

const ROUTE_ENDPOINT_PREFERENCES_KEY = '@milemate/route-endpoint-preferences';

function sanitizeRouteEndpointPreferences(
  value: unknown,
): RouteEndpointPreferences {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_ROUTE_ENDPOINT_PREFERENCES;
  }

  const record = value as Record<string, unknown>;
  const startLocation =
    record.startLocation === null || record.startLocation === undefined
      ? null
      : sanitizeRouteEndpoint(record.startLocation);
  const endLocation =
    record.endLocation === null || record.endLocation === undefined
      ? null
      : sanitizeRouteEndpoint(record.endLocation);

  return {
    startLocation: startLocation ?? createCurrentLocationEndpoint(),
    endLocation,
    startAndEndSameLocation:
      record.startAndEndSameLocation === true ||
      (record.startAndEndSameLocation === undefined && true),
  };
}

function serializeRouteEndpointForStorage(endpoint: RouteEndpoint): RouteEndpoint {
  return sanitizeRouteEndpoint(endpoint) ?? createCurrentLocationEndpoint();
}

function serializePreferences(
  preferences: RouteEndpointPreferences,
): RouteEndpointPreferences {
  return {
    startLocation:
      preferences.startLocation === null
        ? null
        : serializeRouteEndpointForStorage(preferences.startLocation),
    endLocation:
      preferences.endLocation === null
        ? null
        : serializeRouteEndpointForStorage(preferences.endLocation),
    startAndEndSameLocation: preferences.startAndEndSameLocation,
  };
}

export async function getRouteEndpointPreferences(): Promise<RouteEndpointPreferences> {
  const stored = await AsyncStorage.getItem(ROUTE_ENDPOINT_PREFERENCES_KEY);

  if (!stored) {
    return DEFAULT_ROUTE_ENDPOINT_PREFERENCES;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    return sanitizeRouteEndpointPreferences(parsed);
  } catch {
    return DEFAULT_ROUTE_ENDPOINT_PREFERENCES;
  }
}

export async function setRouteEndpointPreferences(
  preferences: RouteEndpointPreferences,
): Promise<void> {
  const sanitized = serializePreferences(
    sanitizeRouteEndpointPreferences(preferences),
  );

  await AsyncStorage.setItem(
    ROUTE_ENDPOINT_PREFERENCES_KEY,
    JSON.stringify(sanitized),
  );
}
