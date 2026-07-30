import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type MapRouteCoordinate = {
  latitude: number;
  longitude: number;
};

type AppleMapDirectionsNativeModule = {
  fetchDrivingPolyline: (points: MapRouteCoordinate[]) => Promise<MapRouteCoordinate[]>;
};

function normalizeCoordinate(value: unknown): MapRouteCoordinate | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const latitude =
    typeof record.latitude === 'number'
      ? record.latitude
      : Number(record.latitude);
  const longitude =
    typeof record.longitude === 'number'
      ? record.longitude
      : Number(record.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

let nativeModule: AppleMapDirectionsNativeModule | null = null;

if (Platform.OS === 'ios') {
  try {
    nativeModule = requireNativeModule<AppleMapDirectionsNativeModule>('AppleMapDirections');
  } catch (error) {
    nativeModule = null;
    if (__DEV__) {
      console.warn(
        '[apple-map-directions] Native module not found. Rebuild the iOS dev client (npx expo run:ios) after pod install.',
        error,
      );
    }
  }
}

export function isAppleMapDirectionsAvailable(): boolean {
  return nativeModule !== null;
}

export async function fetchAppleDrivingPolyline(
  points: MapRouteCoordinate[],
): Promise<MapRouteCoordinate[] | null> {
  if (!nativeModule || points.length < 2) {
    return null;
  }

  const result = await nativeModule.fetchDrivingPolyline(points);
  const normalized = (Array.isArray(result) ? result : [])
    .map(normalizeCoordinate)
    .filter((point): point is MapRouteCoordinate => point !== null);

  if (normalized.length < 2) {
    if (__DEV__) {
      console.warn('[apple-map-directions] Polyline response had too few valid points.', {
        sent: points.length,
        received: Array.isArray(result) ? result.length : 0,
        normalized: normalized.length,
      });
    }
    return null;
  }

  if (__DEV__ && normalized.length <= points.length + 1) {
    console.warn(
      '[apple-map-directions] Polyline looks like waypoints only (MapKit may not have run). Point count:',
      normalized.length,
    );
  }

  return normalized;
}
