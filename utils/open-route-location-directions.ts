import { Linking, Platform } from 'react-native';

import type { RouteLocation } from '@/types/route-location';

function destinationQuery(location: RouteLocation): string {
  return `${location.latitude},${location.longitude}`;
}

function buildCandidates(location: RouteLocation): string[] {
  const destination = destinationQuery(location);
  const address = encodeURIComponent(location.formattedAddress.replace(/\n/g, ', '));
  const dest = Number.isFinite(location.latitude) ? destination : address;
  const candidates: string[] = [];

  if (Platform.OS === 'ios') {
    candidates.push(`maps://?daddr=${dest}`);
    candidates.push(`http://maps.apple.com/?daddr=${dest}`);
  }

  if (Platform.OS === 'android') {
    candidates.push(`google.navigation:q=${dest}`);
    candidates.push(`geo:0,0?q=${dest}`);
  }

  candidates.push(
    `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
  );

  return [...new Set(candidates)];
}

export async function openRouteLocationDirections(
  location: RouteLocation,
): Promise<boolean> {
  for (const url of buildCandidates(location)) {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        continue;
      }

      await Linking.openURL(url);
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

export function openRouteLocationDirectionsSafely(location: RouteLocation): void {
  void openRouteLocationDirections(location).catch((error: unknown) => {
    console.warn('[openRouteLocationDirections] failed:', error);
  });
}
