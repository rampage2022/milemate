import type { SavedLocationInput } from '@/utils/my-locations';
import {
  normalizeSavedLocationAddress,
  sanitizeLatitude,
  sanitizeLongitude,
} from '@/utils/my-locations';

export function shouldRegeocodeSavedLocation(
  input: SavedLocationInput,
  existing?: { address: string; latitude: number | null; longitude: number | null },
): boolean {
  if (!existing) {
    return true;
  }

  const nextAddress = normalizeSavedLocationAddress(input.address);
  const previousAddress = normalizeSavedLocationAddress(existing.address);

  if (nextAddress !== previousAddress) {
    return true;
  }

  const inputLatitude = sanitizeLatitude(input.latitude);
  const inputLongitude = sanitizeLongitude(input.longitude);

  if (inputLatitude !== null && inputLongitude !== null) {
    return false;
  }

  return existing.latitude === null || existing.longitude === null;
}

export function mergeGeocodedCoordinatesIntoSavedLocationInput(
  input: SavedLocationInput,
  latitude: number,
  longitude: number,
): SavedLocationInput {
  return {
    ...input,
    latitude,
    longitude,
  };
}
