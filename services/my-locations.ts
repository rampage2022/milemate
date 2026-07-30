import AsyncStorage from '@react-native-async-storage/async-storage';

import { geocodeAddressForConfirmation } from '@/services/address-geocoding';
import type { SavedLocation } from '@/types/saved-location';
import {
  buildSavedLocationRecord,
  sanitizeSavedLocation,
  validateSavedLocationInput,
  type SavedLocationInput,
  type SavedLocationValidationError,
} from '@/utils/my-locations';
import {
  mergeGeocodedCoordinatesIntoSavedLocationInput,
  shouldRegeocodeSavedLocation,
} from '@/utils/resolve-saved-location-coordinates';

export const MY_LOCATIONS_STORAGE_KEY = '@milemate/my-locations';

export class MyLocationValidationError extends Error {
  readonly code: SavedLocationValidationError;

  constructor(code: SavedLocationValidationError) {
    super(code);
    this.code = code;
  }
}

async function readSavedLocations(): Promise<SavedLocation[]> {
  const stored = await AsyncStorage.getItem(MY_LOCATIONS_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeSavedLocation(entry))
      .filter((entry): entry is SavedLocation => entry !== null);
  } catch {
    return [];
  }
}

async function writeSavedLocations(locations: SavedLocation[]): Promise<void> {
  await AsyncStorage.setItem(MY_LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
}

async function resolveSavedLocationInputCoordinates(
  input: SavedLocationInput,
  existing?: SavedLocation,
): Promise<SavedLocationInput> {
  if (!shouldRegeocodeSavedLocation(input, existing)) {
    return input;
  }

  const geocodeResult = await geocodeAddressForConfirmation(input.address);

  if (geocodeResult.status !== 'success') {
    return input;
  }

  return mergeGeocodedCoordinatesIntoSavedLocationInput(
    input,
    geocodeResult.confirmation.latitude,
    geocodeResult.confirmation.longitude,
  );
}

export async function getMyLocations(): Promise<SavedLocation[]> {
  const locations = await readSavedLocations();

  return [...locations].sort((left, right) => left.label.localeCompare(right.label));
}

export async function getMyLocationById(
  locationId: string,
): Promise<SavedLocation | null> {
  const locations = await readSavedLocations();

  return locations.find((location) => location.id === locationId) ?? null;
}

export async function addMyLocation(input: SavedLocationInput): Promise<SavedLocation> {
  const validationError = validateSavedLocationInput(input);

  if (validationError) {
    throw new MyLocationValidationError(validationError);
  }

  const resolvedInput = await resolveSavedLocationInputCoordinates(input);
  const location = buildSavedLocationRecord(resolvedInput);
  const locations = await readSavedLocations();

  await writeSavedLocations([location, ...locations]);

  return location;
}

export async function editMyLocation(
  locationId: string,
  input: SavedLocationInput,
): Promise<SavedLocation> {
  const validationError = validateSavedLocationInput(input);

  if (validationError) {
    throw new MyLocationValidationError(validationError);
  }

  const locations = await readSavedLocations();
  const existing = locations.find((location) => location.id === locationId);

  if (!existing) {
    throw new Error('Saved location not found');
  }

  const resolvedInput = await resolveSavedLocationInputCoordinates(input, existing);
  const updated = buildSavedLocationRecord(resolvedInput, existing);
  const next = locations.map((location) =>
    location.id === locationId ? updated : location,
  );

  await writeSavedLocations(next);

  return updated;
}

export async function deleteMyLocation(locationId: string): Promise<void> {
  const locations = await readSavedLocations();
  const filtered = locations.filter((location) => location.id !== locationId);

  if (filtered.length === locations.length) {
    return;
  }

  await writeSavedLocations(filtered);
}
