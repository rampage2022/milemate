import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from '@/types/trip';

const TRIPS_STORAGE_KEY = '@milemate/trips';

function isTrip(value: unknown): value is Trip {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.startedAt === 'number' &&
    (record.endedAt === undefined || typeof record.endedAt === 'number') &&
    typeof record.distanceMiles === 'number' &&
    record.distanceMiles >= 0
  );
}

async function readTrips(): Promise<Trip[]> {
  const stored = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTrip);
  } catch {
    return [];
  }
}

async function writeTrips(trips: Trip[]): Promise<void> {
  await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
}

export async function getTrips(): Promise<Trip[]> {
  const trips = await readTrips();

  return trips.sort((a, b) => b.startedAt - a.startedAt);
}

export async function saveTrip(trip: Trip): Promise<void> {
  const trips = await readTrips();
  const index = trips.findIndex((existing) => existing.id === trip.id);

  if (index === -1) {
    await writeTrips([trip, ...trips]);
    return;
  }

  const updated = [...trips];
  updated[index] = trip;
  await writeTrips(updated);
}

export async function deleteTrip(id: string): Promise<void> {
  const trips = await readTrips();
  const filtered = trips.filter((trip) => trip.id !== id);

  if (filtered.length === trips.length) {
    return;
  }

  await writeTrips(filtered);
}
