import { Linking, Platform } from 'react-native';

import type { Store } from '@/types/store';
import { formatStoreAddress } from '@/types/store';

function getCoordinateQuery(store: Store): string | null {
  if (store.latitude === undefined || store.longitude === undefined) {
    return null;
  }

  return `${store.latitude},${store.longitude}`;
}

export function buildStoreMapsUrl(store: Store): string {
  const coordinateQuery = getCoordinateQuery(store);
  const query =
    coordinateQuery ?? encodeURIComponent(formatStoreAddress(store));

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

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatStoreAddress(store))}`;
}

function buildDirectionUrlCandidates(store: Store): string[] {
  const coordinateQuery = getCoordinateQuery(store);
  const addressQuery = encodeURIComponent(formatStoreAddress(store));
  const destination = coordinateQuery ?? addressQuery;
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
