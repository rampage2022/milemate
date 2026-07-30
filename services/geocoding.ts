import * as Location from 'expo-location';

import type { ResolvedLocation } from '@/types/diagnostic-report';

function formatGeocodedAddress(
  results: Location.LocationGeocodedAddress[],
): string | null {
  const first = results[0];

  if (!first) {
    return null;
  }

  const parts = [
    first.name,
    first.street,
    first.city,
    first.region,
    first.postalCode,
    first.country,
  ].filter((part) => typeof part === 'string' && part.length > 0);

  return parts.length > 0 ? parts.join(', ') : null;
}

export async function resolveCoordinateAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    return formatGeocodedAddress(results);
  } catch {
    return null;
  }
}

export async function resolveStartEndLocations(
  entries: Array<{ latitude: number; longitude: number }>,
): Promise<{
  end: ResolvedLocation | null;
  start: ResolvedLocation | null;
}> {
  if (entries.length === 0) {
    return { end: null, start: null };
  }

  const first = entries[0];
  const last = entries[entries.length - 1];

  const [startAddress, endAddress] = await Promise.all([
    resolveCoordinateAddress(first.latitude, first.longitude),
    resolveCoordinateAddress(last.latitude, last.longitude),
  ]);

  return {
    start: {
      latitude: first.latitude,
      longitude: first.longitude,
      address: startAddress,
    },
    end: {
      latitude: last.latitude,
      longitude: last.longitude,
      address: endAddress,
    },
  };
}
