import type { Store } from '@/types/store';
import { formatStoreAddress } from '@/types/store';
import { ADDRESS_UNAVAILABLE_LABEL, hasUsableStructuredAddress } from '@/utils/store-display-address-core';
import {
  resolveVisitLogStoreLocationQuery,
  type VisitLogStoreLocationQuery,
} from '@/utils/visit-log-store-location-action';

const DIRECTIONS_URL_MARKERS = [
  'daddr=',
  'saddr=',
  'dirflg=',
  'destination=',
  'google.navigation:',
  '/maps/dir/',
  '/dir/?',
] as const;

export function storeLocationPreviewPlaceLabel(store: Store): string | undefined {
  if (hasUsableStructuredAddress(store)) {
    const formatted = formatStoreAddress(store).trim();

    if (formatted.length > 0 && formatted !== ADDRESS_UNAVAILABLE_LABEL) {
      return formatted;
    }
  }

  const cached = store.reverseGeocodedAddressLine?.trim();

  return cached && cached.length > 0 ? cached : undefined;
}

function buildGoogleMapsPlaceSearchUrl(query: VisitLogStoreLocationQuery): string {
  if (query.kind === 'coordinates') {
    const coordinateQuery = `${query.latitude},${query.longitude}`;
    return `https://www.google.com/maps/search/?api=1&query=${coordinateQuery}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.query)}`;
}

function buildAppleMapsPlaceUrls(
  locationQuery: VisitLogStoreLocationQuery,
  placeLabel: string | undefined,
): string[] {
  const encodedLabel = placeLabel ? encodeURIComponent(placeLabel) : undefined;
  const urls: string[] = [];

  if (locationQuery.kind === 'coordinates') {
    const { latitude, longitude } = locationQuery;
    const ll = `${latitude},${longitude}`;
    const q = encodedLabel ?? encodeURIComponent(ll);
    const query = `ll=${ll}&q=${q}`;

    urls.push(`https://maps.apple.com/?${query}`);
    return urls;
  }

  const q = encodeURIComponent(locationQuery.query);
  urls.push(`https://maps.apple.com/?q=${q}`);
  return urls;
}

function buildAndroidPlaceSearchUrl(
  locationQuery: VisitLogStoreLocationQuery,
  placeLabel: string | undefined,
): string {
  if (locationQuery.kind === 'coordinates') {
    const label = placeLabel ?? `${locationQuery.latitude},${locationQuery.longitude}`;
    return `geo:${locationQuery.latitude},${locationQuery.longitude}?q=${encodeURIComponent(label)}`;
  }

  return `geo:0,0?q=${encodeURIComponent(locationQuery.query)}`;
}

export function buildStoreLocationPreviewUrlCandidatesForPlatform(
  store: Store,
  platform: 'ios' | 'android' | 'web',
): string[] {
  const locationQuery = resolveVisitLogStoreLocationQuery(store);

  if (!locationQuery) {
    return [];
  }

  const placeLabel = storeLocationPreviewPlaceLabel(store);
  const candidates: string[] = [];

  if (platform === 'ios') {
    candidates.push(...buildAppleMapsPlaceUrls(locationQuery, placeLabel));
  }

  if (platform === 'android') {
    candidates.push(buildAndroidPlaceSearchUrl(locationQuery, placeLabel));
  }

  candidates.push(buildGoogleMapsPlaceSearchUrl(locationQuery));
  return [...new Set(candidates)];
}

export function urlLooksLikeDirectionsMode(url: string): boolean {
  const lower = url.toLowerCase();

  return DIRECTIONS_URL_MARKERS.some((marker) => lower.includes(marker));
}

export function assertStoreLocationPreviewUrlsArePlaceMode(urls: string[]): void {
  for (const url of urls) {
    if (urlLooksLikeDirectionsMode(url)) {
      throw new Error(`Preview URL must not use directions mode: ${url}`);
    }
  }
}
