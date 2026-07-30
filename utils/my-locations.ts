import type { SavedLocation } from '@/types/saved-location';

export type SavedLocationInput = {
  label: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type SavedLocationValidationError =
  | 'blank_label'
  | 'blank_address'
  | 'invalid_latitude'
  | 'invalid_longitude';

export function normalizeSavedLocationLabel(label: string): string {
  return label.trim();
}

export function normalizeSavedLocationAddress(address: string): string {
  return address.trim();
}

export function sanitizeCoordinate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function sanitizeLatitude(value: unknown): number | null {
  const coordinate = sanitizeCoordinate(value);

  if (coordinate === null) {
    return null;
  }

  if (coordinate < -90 || coordinate > 90) {
    return null;
  }

  return coordinate;
}

export function sanitizeLongitude(value: unknown): number | null {
  const coordinate = sanitizeCoordinate(value);

  if (coordinate === null) {
    return null;
  }

  if (coordinate < -180 || coordinate > 180) {
    return null;
  }

  return coordinate;
}

export function validateSavedLocationInput(
  input: SavedLocationInput,
): SavedLocationValidationError | null {
  if (normalizeSavedLocationLabel(input.label).length === 0) {
    return 'blank_label';
  }

  if (normalizeSavedLocationAddress(input.address).length === 0) {
    return 'blank_address';
  }

  if (input.latitude !== undefined && input.latitude !== null) {
    const latitude = sanitizeLatitude(input.latitude);

    if (latitude === null) {
      return 'invalid_latitude';
    }
  }

  if (input.longitude !== undefined && input.longitude !== null) {
    const longitude = sanitizeLongitude(input.longitude);

    if (longitude === null) {
      return 'invalid_longitude';
    }
  }

  return null;
}

export function sanitizeSavedLocation(value: unknown): SavedLocation | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.id !== 'string' || record.id.trim().length === 0) {
    return null;
  }

  if (typeof record.label !== 'string' || typeof record.address !== 'string') {
    return null;
  }

  const label = normalizeSavedLocationLabel(record.label);
  const address = normalizeSavedLocationAddress(record.address);

  if (label.length === 0 || address.length === 0) {
    return null;
  }

  const latitude = sanitizeLatitude(record.latitude);
  const longitude = sanitizeLongitude(record.longitude);
  const createdAt =
    typeof record.createdAt === 'string'
      ? record.createdAt
      : typeof record.createdAt === 'number' && Number.isFinite(record.createdAt)
        ? new Date(record.createdAt).toISOString()
        : new Date().toISOString();
  const updatedAt =
    typeof record.updatedAt === 'string'
      ? record.updatedAt
      : typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? new Date(record.updatedAt).toISOString()
        : createdAt;

  return {
    id: record.id.trim(),
    label,
    address,
    latitude,
    longitude,
    createdAt,
    updatedAt,
  };
}

export function buildSavedLocationRecord(
  input: SavedLocationInput,
  existing?: SavedLocation,
): SavedLocation {
  const now = new Date().toISOString();
  const latitude =
    input.latitude === undefined ? (existing?.latitude ?? null) : sanitizeLatitude(input.latitude);
  const longitude =
    input.longitude === undefined
      ? (existing?.longitude ?? null)
      : sanitizeLongitude(input.longitude);

  return {
    id: existing?.id ?? `loc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    label: normalizeSavedLocationLabel(input.label),
    address: normalizeSavedLocationAddress(input.address),
    latitude,
    longitude,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function indexSavedLocationsById(
  locations: SavedLocation[],
): Record<string, SavedLocation> {
  const map: Record<string, SavedLocation> = {};

  for (const location of locations) {
    map[location.id] = location;
  }

  return map;
}
