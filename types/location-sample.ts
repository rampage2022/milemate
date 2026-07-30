export type AcceptedLocationSample = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedMetersPerSecond: number | null;
  timestamp: number;
};

export function toAcceptedLocationSample(input: {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
}): AcceptedLocationSample | null {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    return null;
  }

  return {
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters:
      input.accuracy !== null && Number.isFinite(input.accuracy)
        ? input.accuracy
        : null,
    speedMetersPerSecond:
      input.speed !== null && Number.isFinite(input.speed) ? input.speed : null,
    timestamp: input.timestamp,
  };
}
