export type RouteLocationSource =
  | 'manual'
  | 'current-location'
  | 'saved-route'
  | 'profile';

export type RouteLocation = {
  id: string;
  name?: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  source: RouteLocationSource;
};

export function createRouteLocationId(): string {
  return `rloc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isVerifiedCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isVerifiedRouteLocation(value: unknown): value is RouteLocation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.formattedAddress === 'string' &&
    record.formattedAddress.trim().length > 0 &&
    isVerifiedCoordinate(record.latitude) &&
    isVerifiedCoordinate(record.longitude) &&
    record.latitude >= -90 &&
    record.latitude <= 90 &&
    record.longitude >= -180 &&
    record.longitude <= 180 &&
    (record.source === 'manual' ||
      record.source === 'current-location' ||
      record.source === 'saved-route' ||
      record.source === 'profile') &&
    (record.name === undefined || typeof record.name === 'string')
  );
}

export function sanitizeRouteLocation(value: unknown): RouteLocation | null {
  if (!isVerifiedRouteLocation(value)) {
    return null;
  }

  return {
    id: value.id,
    name: value.name?.trim() || undefined,
    formattedAddress: value.formattedAddress.trim(),
    latitude: value.latitude,
    longitude: value.longitude,
    source: value.source,
  };
}
