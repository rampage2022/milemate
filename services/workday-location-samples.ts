import type { LocationUpdate } from '@/services/location';
import type { AcceptedLocationSample } from '@/types/location-sample';
import { toAcceptedLocationSample } from '@/types/location-sample';
import { getActiveAccumulatorTripId } from '@/services/workday-distance-accumulator';

type WorkdayLocationSampleListener = (sample: AcceptedLocationSample) => void;

let latestSample: AcceptedLocationSample | null = null;
const listeners = new Set<WorkdayLocationSampleListener>();

export function publishWorkdayLocationSampleFromUpdate(
  update: LocationUpdate,
): AcceptedLocationSample | null {
  const sample = toAcceptedLocationSample({
    latitude: update.latitude,
    longitude: update.longitude,
    accuracy: update.accuracy,
    speed: update.speed,
    timestamp: update.timestamp,
  });

  if (!sample) {
    return null;
  }

  latestSample = sample;

  for (const listener of listeners) {
    listener(sample);
  }

  return sample;
}

export function getLatestWorkdayLocationSample(): AcceptedLocationSample | null {
  return latestSample;
}

export function subscribeToWorkdayLocationSamples(
  listener: WorkdayLocationSampleListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function clearWorkdayLocationSamples(): void {
  latestSample = null;
}

export function isWorkdayLocationStreamActive(): boolean {
  return getActiveAccumulatorTripId() !== null;
}
