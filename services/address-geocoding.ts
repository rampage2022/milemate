import * as Location from 'expo-location';

import { isVerifiedCoordinate } from '@/types/route-location';

export type GeocodedAddressConfirmation = {
  latitude: number;
  longitude: number;
  name: string | null;
  streetLine: string;
  cityStatePostal: string;
  formattedAddress: string;
};

export type GeocodeAddressResult =
  | { status: 'success'; confirmation: GeocodedAddressConfirmation }
  | { status: 'not_found' }
  | { status: 'unavailable'; message: string };

function buildStreetLine(result: Location.LocationGeocodedAddress): string {
  const parts = [result.name, result.street, result.streetNumber]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part!.trim());

  const unique = [...new Set(parts)];

  return unique.join(' ').trim();
}

function buildCityStatePostal(result: Location.LocationGeocodedAddress): string {
  const cityState = [result.city, result.region]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
  const postal =
    typeof result.postalCode === 'string' && result.postalCode.trim().length > 0
      ? result.postalCode.trim()
      : '';

  if (cityState && postal) {
    return `${cityState} ${postal}`;
  }

  return cityState || postal;
}

export function buildConfirmationFromReverseGeocode(input: {
  latitude: number;
  longitude: number;
  fallbackAddress: string;
  results: Location.LocationGeocodedAddress[];
}): GeocodedAddressConfirmation {
  const first = input.results[0];

  if (!first) {
    return {
      latitude: input.latitude,
      longitude: input.longitude,
      name: null,
      streetLine: input.fallbackAddress,
      cityStatePostal: '',
      formattedAddress: input.fallbackAddress,
    };
  }

  const streetLine = buildStreetLine(first);
  const cityStatePostal = buildCityStatePostal(first);
  const name =
    typeof first.name === 'string' && first.name.trim().length > 0
      ? first.name.trim()
      : null;
  const formattedAddress = [streetLine, cityStatePostal]
    .filter((part) => part.length > 0)
    .join('\n');

  return {
    latitude: input.latitude,
    longitude: input.longitude,
    name,
    streetLine: streetLine.length > 0 ? streetLine : input.fallbackAddress,
    cityStatePostal,
    formattedAddress:
      formattedAddress.length > 0 ? formattedAddress : input.fallbackAddress,
  };
}

export async function reverseGeocodeForConfirmation(input: {
  latitude: number;
  longitude: number;
  fallbackAddress: string;
}): Promise<GeocodedAddressConfirmation> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: input.latitude,
      longitude: input.longitude,
    });

    return buildConfirmationFromReverseGeocode({
      latitude: input.latitude,
      longitude: input.longitude,
      fallbackAddress: input.fallbackAddress,
      results,
    });
  } catch {
    return {
      latitude: input.latitude,
      longitude: input.longitude,
      name: null,
      streetLine: input.fallbackAddress,
      cityStatePostal: '',
      formattedAddress: input.fallbackAddress,
    };
  }
}

export async function geocodeAddressForConfirmation(
  address: string,
): Promise<GeocodeAddressResult> {
  const trimmed = address.trim();

  if (!trimmed) {
    return { status: 'not_found' };
  }

  try {
    const results = await Location.geocodeAsync(trimmed);

    if (!results || results.length === 0) {
      return { status: 'not_found' };
    }

    const first = results[0];

    if (
      !isVerifiedCoordinate(first.latitude) ||
      !isVerifiedCoordinate(first.longitude)
    ) {
      return { status: 'not_found' };
    }

    const confirmation = await reverseGeocodeForConfirmation({
      latitude: first.latitude,
      longitude: first.longitude,
      fallbackAddress: trimmed,
    });

    return {
      status: 'success',
      confirmation,
    };
  } catch (error) {
    console.error('[address-geocoding] geocode failed:', error);

    return {
      status: 'unavailable',
      message:
        "We couldn't verify this address right now. Check your connection and try again.",
    };
  }
}
