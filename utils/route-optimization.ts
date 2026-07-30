import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import type { PlannedRouteEstimate } from '@/types/route-planning';
import { distanceMiles } from '@/utils/distance';

export type OptimizableStop = {
  visitId: string;
  storeId: string;
  latitude: number;
  longitude: number;
};

const AVERAGE_DRIVING_SPEED_MPH = 35;
const MINUTES_PER_STOP = 12;

function coordinateFromLocation(location: RouteLocation) {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

function nearestNeighborOrder(
  start: RouteLocation,
  stops: OptimizableStop[],
  end: RouteLocation,
): OptimizableStop[] {
  if (stops.length <= 1) {
    return [...stops];
  }

  const remaining = [...stops];
  const ordered: OptimizableStop[] = [];
  let current = coordinateFromLocation(start);

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const miles = distanceMiles(current, {
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      });

      if (miles < nearestDistance) {
        nearestDistance = miles;
        nearestIndex = index;
      }
    }

    const nextStop = remaining.splice(nearestIndex, 1)[0];
    ordered.push(nextStop);
    current = {
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
    };
  }

  return ordered;
}

export function optimizeStopOrder(input: {
  start: RouteLocation;
  end: RouteLocation;
  stops: OptimizableStop[];
}): OptimizableStop[] {
  return nearestNeighborOrder(input.start, input.stops, input.end);
}

export function calculatePlannedRouteDistanceMiles(input: {
  start: RouteLocation;
  end: RouteLocation;
  orderedStops: OptimizableStop[];
}): number {
  const points = [
    coordinateFromLocation(input.start),
    ...input.orderedStops.map((stop) => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
    })),
    coordinateFromLocation(input.end),
  ];

  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    total += distanceMiles(points[index - 1], points[index]);
  }

  return total;
}

export function buildPlannedRouteEstimate(input: {
  start: RouteLocation;
  end: RouteLocation;
  orderedStops: OptimizableStop[];
  startedAt?: Date;
}): PlannedRouteEstimate {
  const distanceMilesTotal = calculatePlannedRouteDistanceMiles(input);
  const drivingMinutes = Math.round((distanceMilesTotal / AVERAGE_DRIVING_SPEED_MPH) * 60);
  const stopMinutes = input.orderedStops.length * MINUTES_PER_STOP;
  const driveTimeMinutes = drivingMinutes + stopMinutes;
  const base = input.startedAt ?? new Date();
  const estimatedFinish = new Date(base.getTime() + driveTimeMinutes * 60 * 1000);

  return {
    distanceMiles: Math.round(distanceMilesTotal * 10) / 10,
    driveTimeMinutes,
    estimatedFinishAt: estimatedFinish.toISOString(),
    method: 'direct-segment-sum',
  };
}

export function storeToOptimizableStop(
  visitId: string,
  store: Store,
): OptimizableStop | null {
  if (
    typeof store.latitude !== 'number' ||
    typeof store.longitude !== 'number' ||
    !Number.isFinite(store.latitude) ||
    !Number.isFinite(store.longitude)
  ) {
    return null;
  }

  return {
    visitId,
    storeId: store.id,
    latitude: store.latitude,
    longitude: store.longitude,
  };
}

export function formatDriveTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours <= 0) {
    return `${remainder} min`;
  }

  if (remainder === 0) {
    return hours === 1 ? '1 hr' : `${hours} hr`;
  }

  return `${hours} hr ${remainder} min`;
}

export function formatEstimatedFinish(iso: string): string {
  const date = new Date(iso);

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
