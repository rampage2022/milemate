import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from '@/types/trip';

/**
 * Storage key for the in-progress GPS session (active workday).
 *
 * Separate from completed trips (`@milemate/trips` in services/trips.ts).
 * Written when a workday starts or distance updates; cleared after End Workday
 * successfully saves the completed Trip.
 */
export const ACTIVE_TRIP_STORAGE_KEY = '@milemate/active-trip';

function isActiveTrip(value: unknown): value is Trip {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.id !== 'string' ||
    typeof record.startedAt !== 'number' ||
    record.endedAt !== undefined ||
    typeof record.distanceMiles !== 'number' ||
    record.distanceMiles < 0
  ) {
    return false;
  }

  if (record.routeContext !== undefined) {
    if (typeof record.routeContext !== 'object' || record.routeContext === null) {
      return false;
    }
  }

  return true;
}

export async function getActiveTrip(): Promise<Trip | null> {
  const stored = await AsyncStorage.getItem(ACTIVE_TRIP_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!isActiveTrip(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function saveActiveTrip(trip: Trip): Promise<void> {
  if (trip.endedAt !== undefined) {
    throw new Error('Cannot persist a completed trip as the active trip');
  }

  await AsyncStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, JSON.stringify(trip));
}

export async function clearActiveTrip(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
}
