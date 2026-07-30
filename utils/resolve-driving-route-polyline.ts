import { Platform } from 'react-native';

import type { RouteLocation } from '@/types/route-location';
import type { OptimizableStop } from '@/utils/route-optimization';
import { fetchAppleDrivingPolyline } from 'apple-map-directions';

export type RouteMapCoordinate = {
  latitude: number;
  longitude: number;
};

export function buildWaypointCoordinates(input: {
  end: RouteLocation;
  orderedStops: OptimizableStop[];
  start: RouteLocation;
}): RouteMapCoordinate[] {
  return [
    { latitude: input.start.latitude, longitude: input.start.longitude },
    ...input.orderedStops.map((stop) => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
    })),
    { latitude: input.end.latitude, longitude: input.end.longitude },
  ];
}

/** iOS MapKit driving geometry; null on failure or non-iOS (use straight waypoint fallback). */
export async function resolveDrivingRoutePolyline(input: {
  end: RouteLocation;
  orderedStops: OptimizableStop[];
  start: RouteLocation;
}): Promise<RouteMapCoordinate[] | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const waypoints = buildWaypointCoordinates(input);

  try {
    return await fetchAppleDrivingPolyline(waypoints);
  } catch (error) {
    console.warn('[resolveDrivingRoutePolyline] MapKit directions failed:', error);
    return null;
  }
}
