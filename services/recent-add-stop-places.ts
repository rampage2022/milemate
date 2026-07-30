import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RouteLocation } from '@/types/route-location';

const RECENT_ADD_STOP_KEY = '@milemate/recent-add-stop-places';
const MAX_RECENT = 12;

export type RecentAddStopPlace = {
  addedAt: number;
  id: string;
  kind: 'address' | 'store';
  location?: RouteLocation;
  storeId?: string;
  subtitle: string;
  title: string;
};

function parseRecent(value: string | null): RecentAddStopPlace[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is RecentAddStopPlace => {
      if (typeof entry !== 'object' || entry === null) {
        return false;
      }

      const item = entry as RecentAddStopPlace;

      return (
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        (item.kind === 'store' || item.kind === 'address')
      );
    });
  } catch {
    return [];
  }
}

export async function getRecentAddStopPlaces(): Promise<RecentAddStopPlace[]> {
  const raw = await AsyncStorage.getItem(RECENT_ADD_STOP_KEY);
  const items = parseRecent(raw);

  return items.sort((left, right) => right.addedAt - left.addedAt).slice(0, MAX_RECENT);
}

export async function recordRecentStoreStop(input: {
  storeId: string;
  subtitle: string;
  title: string;
}): Promise<void> {
  const current = await getRecentAddStopPlaces();
  const next: RecentAddStopPlace = {
    addedAt: Date.now(),
    id: `recent-store-${input.storeId}`,
    kind: 'store',
    storeId: input.storeId,
    subtitle: input.subtitle,
    title: input.title,
  };
  const filtered = current.filter(
    (item) => !(item.kind === 'store' && item.storeId === input.storeId),
  );

  await AsyncStorage.setItem(
    RECENT_ADD_STOP_KEY,
    JSON.stringify([next, ...filtered].slice(0, MAX_RECENT)),
  );
}

export async function recordRecentAddressStop(input: {
  location: RouteLocation;
  subtitle: string;
  title: string;
}): Promise<void> {
  const current = await getRecentAddStopPlaces();
  const placeKey = `${input.location.latitude.toFixed(4)}:${input.location.longitude.toFixed(4)}`;
  const next: RecentAddStopPlace = {
    addedAt: Date.now(),
    id: `recent-address-${placeKey}`,
    kind: 'address',
    location: input.location,
    subtitle: input.subtitle,
    title: input.title,
  };
  const filtered = current.filter((item) => item.id !== next.id);

  await AsyncStorage.setItem(
    RECENT_ADD_STOP_KEY,
    JSON.stringify([next, ...filtered].slice(0, MAX_RECENT)),
  );
}

/** @internal */
export async function __clearRecentAddStopPlacesForTests(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_ADD_STOP_KEY);
}
