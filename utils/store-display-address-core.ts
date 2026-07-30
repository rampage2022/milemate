import type { Store } from '@/types/store';

const COORDINATE_LINE_PATTERN =
  /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;

export const ADDRESS_UNAVAILABLE_LABEL = 'Address unavailable';

export type GeocodedAddressFields = {
  streetNumber?: string | null;
  street?: string | null;
  name?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  formattedAddress?: string | null;
};

const ADDRESS_PLACEHOLDER_PATTERN =
  /^(n\/a|na|none|null|undefined|tbd|unknown|\.|-+|—+|pending|missing)$/i;

export function isAddressPlaceholder(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return true;
  }

  return ADDRESS_PLACEHOLDER_PATTERN.test(trimmed);
}

export function looksLikeCoordinateAddressLine(value: string): boolean {
  return COORDINATE_LINE_PATTERN.test(value.trim());
}

export function hasUsableStructuredAddress(store: Store): boolean {
  const line = store.addressLine1.trim();

  if (line.length === 0) {
    return false;
  }

  if (isAddressPlaceholder(line)) {
    return false;
  }

  if (looksLikeCoordinateAddressLine(line)) {
    return false;
  }

  return store.city.trim().length > 0 || store.state.trim().length > 0;
}

export function buildReadableLineFromGeocodeResult(
  result: GeocodedAddressFields,
): string {
  const streetParts = [result.streetNumber, result.street, result.name]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part!.trim());

  const uniqueStreetParts = [...new Set(streetParts)];
  const streetLine = uniqueStreetParts.join(' ').trim();

  const city =
    typeof result.city === 'string' && result.city.trim().length > 0
      ? result.city.trim()
      : '';
  const region =
    typeof result.region === 'string' && result.region.trim().length > 0
      ? result.region.trim()
      : '';
  const postal =
    typeof result.postalCode === 'string' && result.postalCode.trim().length > 0
      ? result.postalCode.trim()
      : '';

  const cityStatePostal = [city, region].filter(Boolean).join(', ');
  const locality = [cityStatePostal, postal].filter(Boolean).join(' ').trim();

  if (streetLine.length > 0 && locality.length > 0) {
    return `${streetLine}, ${locality}`;
  }

  if (streetLine.length > 0) {
    return streetLine;
  }

  if (locality.length > 0) {
    return locality;
  }

  if (typeof result.formattedAddress === 'string') {
    const formatted = result.formattedAddress.trim();

    if (formatted.length > 0 && !looksLikeCoordinateAddressLine(formatted)) {
      return formatted;
    }
  }

  return '';
}

export function resolveStoreDisplayAddressLine(store: Store): string {
  if (hasUsableStructuredAddress(store)) {
    return store.addressLine1.trim();
  }

  const cached = store.reverseGeocodedAddressLine?.trim();

  if (cached && !looksLikeCoordinateAddressLine(cached)) {
    return cached;
  }

  const fallbackLine = store.addressLine1.trim();

  if (
    fallbackLine.length > 0 &&
    !looksLikeCoordinateAddressLine(fallbackLine) &&
    !isAddressPlaceholder(fallbackLine)
  ) {
    return fallbackLine;
  }

  if (
    typeof store.latitude === 'number' &&
    typeof store.longitude === 'number' &&
    Number.isFinite(store.latitude) &&
    Number.isFinite(store.longitude)
  ) {
    return ADDRESS_UNAVAILABLE_LABEL;
  }

  return store.name.trim() || ADDRESS_UNAVAILABLE_LABEL;
}

export function storeNeedsReverseGeocode(store: Store): boolean {
  if (hasUsableStructuredAddress(store)) {
    return false;
  }

  if (store.reverseGeocodedAddressLine?.trim()) {
    return false;
  }

  return (
    typeof store.latitude === 'number' &&
    typeof store.longitude === 'number' &&
    Number.isFinite(store.latitude) &&
    Number.isFinite(store.longitude)
  );
}
