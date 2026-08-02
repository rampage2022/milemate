import { Linking, Platform } from 'react-native';

import type { Store } from '@/types/store';
import { formatStoreAddress } from '@/types/store';
import { ADDRESS_UNAVAILABLE_LABEL } from '@/utils/store-display-address-core';
import { hasValidImportCoordinates } from '@/utils/store-import/normalize-import-coordinates';
import { buildStoreLocationPreviewUrlCandidatesForPlatform } from '@/utils/store-location-preview-urls';

export function buildStoreLocationPreviewUrlCandidates(store: Store): string[] {
  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  return buildStoreLocationPreviewUrlCandidatesForPlatform(store, platform);
}

/** Opens store destination in maps for preview (not turn-by-turn navigation). */
export async function openStoreLocationPreviewInMaps(store: Store): Promise<boolean> {
  const candidates = buildStoreLocationPreviewUrlCandidates(store);

  if (candidates.length === 0) {
    return false;
  }

  const orderedCandidates =
    Platform.OS === 'ios'
      ? [
          ...candidates.filter((url) => url.startsWith('https://')),
          ...candidates.filter((url) => !url.startsWith('https://')),
        ]
      : candidates;

  for (const url of orderedCandidates) {
    const opened = await tryOpenUrl(url);

    if (opened) {
      return true;
    }
  }

  for (const url of orderedCandidates.filter((candidate) => candidate.startsWith('https://'))) {
    try {
      await Linking.openURL(url);
      return true;
    } catch (error) {
      console.warn('[store-navigation] Unable to open location preview URL:', url, error);
    }
  }

  return false;
}

export function openStoreLocationPreviewInMapsSafely(store: Store): void {
  void openStoreLocationPreviewInMaps(store).catch((error: unknown) => {
    console.warn('[store-navigation] Location preview launch failed:', error);
  });
}

function getCoordinateQuery(store: Store): string | null {
  if (
    !hasValidImportCoordinates({
      latitude: store.latitude,
      longitude: store.longitude,
    })
  ) {
    return null;
  }

  return `${store.latitude},${store.longitude}`;
}

export function buildStoreMapsUrl(store: Store): string {
  const coordinateQuery = getCoordinateQuery(store);
  const formatted = formatStoreAddress(store).trim();
  const query =
    coordinateQuery ??
    (formatted.length > 0 && formatted !== ADDRESS_UNAVAILABLE_LABEL
      ? encodeURIComponent(formatted)
      : '');

  if (!query) {
    return buildGoogleMapsSearchUrl(store);
  }

  if (Platform.OS === 'ios') {
    return `maps://?daddr=${query}`;
  }

  if (Platform.OS === 'android') {
    return `geo:0,0?q=${query}`;
  }

  return buildGoogleMapsSearchUrl(store);
}

function buildGoogleMapsSearchUrl(store: Store): string {
  const coordinateQuery = getCoordinateQuery(store);

  if (coordinateQuery) {
    return `https://www.google.com/maps/search/?api=1&query=${coordinateQuery}`;
  }

  const formatted = formatStoreAddress(store).trim();
  const query =
    formatted.length > 0 && formatted !== ADDRESS_UNAVAILABLE_LABEL
      ? encodeURIComponent(formatted)
      : '';

  if (!query) {
    return 'https://www.google.com/maps';
  }

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function buildDirectionUrlCandidates(store: Store): string[] {
  const coordinateQuery = getCoordinateQuery(store);
  const formatted = formatStoreAddress(store).trim();
  const addressQuery =
    formatted.length > 0 && formatted !== ADDRESS_UNAVAILABLE_LABEL
      ? encodeURIComponent(formatted)
      : null;
  const destination = coordinateQuery ?? addressQuery;

  if (!destination) {
    return [buildGoogleMapsSearchUrl(store)];
  }

  const candidates: string[] = [];

  if (Platform.OS === 'ios') {
    candidates.push(`maps://?daddr=${destination}`);
    candidates.push(`http://maps.apple.com/?daddr=${destination}`);
  }

  if (Platform.OS === 'android') {
    candidates.push(`geo:0,0?q=${destination}`);
    candidates.push(`google.navigation:q=${destination}`);
  }

  candidates.push(buildGoogleMapsSearchUrl(store));
  candidates.push(
    `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
  );

  return [...new Set(candidates)];
}

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function openStoreDirections(store: Store): Promise<boolean> {
  const candidates = buildDirectionUrlCandidates(store);

  for (const url of candidates) {
    const opened = await tryOpenUrl(url);

    if (opened) {
      return true;
    }
  }

  for (const url of candidates.filter((candidate) => candidate.startsWith('https://'))) {
    try {
      await Linking.openURL(url);
      return true;
    } catch (error) {
      console.warn('[store-navigation] Unable to open directions URL:', url, error);
    }
  }

  console.warn(
    '[store-navigation] No maps handler available for store:',
    store.name,
  );

  return false;
}

export function openStoreDirectionsSafely(store: Store): void {
  void openStoreDirections(store).catch((error: unknown) => {
    console.warn('[store-navigation] Directions launch failed:', error);
  });
}
