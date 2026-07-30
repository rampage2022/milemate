export type StoreArrivalConfig = {
  enterRadiusMeters: number;
  exitBufferMeters: number;
  maxAccuracyMeters: number;
  minimumConsecutiveInsideReadings: number;
  dwellDurationMs: number;
  staleSampleThresholdMs: number;
  arrivalCooldownMs: number;
};

export const DEFAULT_STORE_ARRIVAL_CONFIG: StoreArrivalConfig = {
  enterRadiusMeters: 150,
  exitBufferMeters: 75,
  maxAccuracyMeters: 75,
  minimumConsecutiveInsideReadings: 2,
  dwellDurationMs: 20_000,
  staleSampleThresholdMs: 30_000,
  arrivalCooldownMs: 60_000,
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  from: Coordinates,
  to: Coordinates,
): number {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getExitRadiusMeters(config: StoreArrivalConfig): number {
  return config.enterRadiusMeters + config.exitBufferMeters;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function estimateEtaMinutes(
  distanceMiles: number,
  averageSpeedMph = 25,
): number {
  if (distanceMiles <= 0 || averageSpeedMph <= 0) {
    return 0;
  }

  return Math.max(1, Math.round((distanceMiles / averageSpeedMph) * 60));
}

export type StoreArrivalSnapshot = {
  hasArrived: boolean;
  distanceMiles: number | null;
  estimatedEtaMinutes: number | null;
};

export function formatTravelEstimate(snapshot: StoreArrivalSnapshot): string | null {
  if (snapshot.hasArrived) {
    return null;
  }

  if (snapshot.distanceMiles === null) {
    return null;
  }

  const distanceLabel = `${snapshot.distanceMiles.toFixed(1)} mi`;

  if (snapshot.estimatedEtaMinutes === null) {
    return distanceLabel;
  }

  return `${distanceLabel} · ~${snapshot.estimatedEtaMinutes} min`;
}
