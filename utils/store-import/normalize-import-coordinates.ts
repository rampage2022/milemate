import {
  compactImportHeader,
  normalizeImportHeader,
} from '@/utils/store-import/normalize-import-header';
import { looksLikeLatitude, looksLikeLongitude } from '@/utils/store-import/value-analysis';
import {
  isAddressPlaceholder,
  looksLikeCoordinateAddressLine,
} from '@/utils/store-display-address-core';

/** Trim and parse a coordinate from CSV strings (including numeric inputs). */
export function parseImportCoordinate(
  value: string | number | undefined | null,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed.replace(/,/g, ''));

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCoordinatePair(
  value: string,
): { latitude: number; longitude: number } | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (looksLikeCoordinateAddressLine(trimmed)) {
    const [latRaw, lngRaw] = trimmed.split(',').map((part) => part.trim());
    const latitude = parseImportCoordinate(latRaw);
    const longitude = parseImportCoordinate(lngRaw);

    if (
      latitude !== undefined &&
      longitude !== undefined &&
      looksLikeLatitude(String(latitude)) &&
      looksLikeLongitude(String(longitude))
    ) {
      return { latitude, longitude };
    }
  }

  return null;
}

export function sanitizeImportedAddressComponent(value: string): string {
  const trimmed = value.trim();

  if (isAddressPlaceholder(trimmed) || looksLikeCoordinateAddressLine(trimmed)) {
    return '';
  }

  return trimmed;
}

const LATITUDE_HEADER_KEYS = new Set(['lat', 'latitude']);
const LONGITUDE_HEADER_KEYS = new Set(['lng', 'lon', 'long', 'longitude']);

function headerKeyForCoordinateColumn(column: string): 'latitude' | 'longitude' | null {
  const compact = compactImportHeader(normalizeImportHeader(column));

  if (LATITUDE_HEADER_KEYS.has(compact)) {
    return 'latitude';
  }

  if (LONGITUDE_HEADER_KEYS.has(compact)) {
    return 'longitude';
  }

  return null;
}

/** Read lat/lng from mapped fields and from common column header names in the row. */
export function resolveImportCoordinates(input: {
  row: Record<string, string>;
  mappedLatitude: string;
  mappedLongitude: string;
  addressLine1: string;
  fullAddressText?: string;
}): { latitude?: number; longitude?: number } {
  let latitudeRaw = input.mappedLatitude.trim();
  let longitudeRaw = input.mappedLongitude.trim();

  for (const [column, rawValue] of Object.entries(input.row)) {
    const value = rawValue?.trim() ?? '';

    if (!value) {
      continue;
    }

    const kind = headerKeyForCoordinateColumn(column);

    if (kind === 'latitude' && !latitudeRaw) {
      latitudeRaw = value;
    }

    if (kind === 'longitude' && !longitudeRaw) {
      longitudeRaw = value;
    }
  }

  let latitude = parseImportCoordinate(latitudeRaw);
  let longitude = parseImportCoordinate(longitudeRaw);

  if (latitude !== undefined && !looksLikeLatitude(String(latitude))) {
    latitude = undefined;
  }

  if (longitude !== undefined && !looksLikeLongitude(String(longitude))) {
    longitude = undefined;
  }

  if (latitude !== undefined && longitude !== undefined) {
    return { latitude, longitude };
  }

  for (const candidate of [input.addressLine1, input.fullAddressText ?? '']) {
    const pair = parseCoordinatePair(candidate);

    if (pair) {
      return pair;
    }
  }

  return {
    latitude,
    longitude,
  };
}

export function hasValidImportCoordinates(input: {
  latitude?: number;
  longitude?: number;
}): boolean {
  return (
    typeof input.latitude === 'number' &&
    typeof input.longitude === 'number' &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude) &&
    looksLikeLatitude(String(input.latitude)) &&
    looksLikeLongitude(String(input.longitude))
  );
}
