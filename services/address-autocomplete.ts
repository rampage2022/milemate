import * as Location from 'expo-location';

import {
  reverseGeocodeForConfirmation,
  type GeocodedAddressConfirmation,
} from '@/services/address-geocoding';
import { isVerifiedCoordinate } from '@/types/route-location';

export type AddressSuggestion = {
  confirmation: GeocodedAddressConfirmation;
  id: string;
  primaryLine: string;
  secondaryLine: string;
};

export type FetchAddressSuggestionsResult =
  | { status: 'success'; suggestions: AddressSuggestion[] }
  | { status: 'empty' }
  | { status: 'error'; message: string };

export const ADDRESS_AUTOCOMPLETE_MIN_CHARS = 3;

const MAX_GEOCODE_RESULTS = 6;

function suggestionId(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
}

export async function fetchAddressSuggestions(
  query: string,
): Promise<FetchAddressSuggestionsResult> {
  const trimmed = query.trim();

  if (trimmed.length < ADDRESS_AUTOCOMPLETE_MIN_CHARS) {
    return { status: 'empty' };
  }

  try {
    const results = await Location.geocodeAsync(trimmed);

    if (!results || results.length === 0) {
      return { status: 'empty' };
    }

    const coordinates = results
      .filter(
        (result) =>
          isVerifiedCoordinate(result.latitude) &&
          isVerifiedCoordinate(result.longitude),
      )
      .slice(0, MAX_GEOCODE_RESULTS);

    if (coordinates.length === 0) {
      return { status: 'empty' };
    }

    const confirmations = await Promise.all(
      coordinates.map((coordinate) =>
        reverseGeocodeForConfirmation({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          fallbackAddress: trimmed,
        }),
      ),
    );

    const seen = new Set<string>();
    const suggestions: AddressSuggestion[] = [];

    for (const confirmation of confirmations) {
      const id = suggestionId(confirmation.latitude, confirmation.longitude);

      if (seen.has(id)) {
        continue;
      }

      seen.add(id);
      suggestions.push({
        id,
        confirmation,
        primaryLine: confirmation.streetLine,
        secondaryLine: confirmation.cityStatePostal,
      });
    }

    return suggestions.length > 0
      ? { status: 'success', suggestions }
      : { status: 'empty' };
  } catch (error) {
    console.error('[address-autocomplete] search failed:', error);

    return {
      status: 'error',
      message:
        "We couldn't search addresses right now. Check your connection and try again.",
    };
  }
}
