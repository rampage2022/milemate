import type { Store } from '@/types/store';
import { formatStoreAddress } from '@/types/store';
import { ADDRESS_UNAVAILABLE_LABEL, hasUsableStructuredAddress, isAddressPlaceholder, looksLikeCoordinateAddressLine } from '@/utils/store-display-address-core';
import { hasValidImportCoordinates } from '@/utils/store-import/normalize-import-coordinates';

export type VisitLogStoreLocationQuery =
  | { kind: 'coordinates'; latitude: number; longitude: number }
  | { kind: 'address'; query: string };

export function resolveVisitLogStoreLocationQuery(
  store: Store,
): VisitLogStoreLocationQuery | null {
  if (
    hasValidImportCoordinates({
      latitude: store.latitude,
      longitude: store.longitude,
    })
  ) {
    return {
      kind: 'coordinates',
      latitude: store.latitude!,
      longitude: store.longitude!,
    };
  }

  if (hasUsableStructuredAddress(store)) {
    const formatted = formatStoreAddress(store).trim();

    if (formatted.length > 0 && formatted !== ADDRESS_UNAVAILABLE_LABEL) {
      return { kind: 'address', query: formatted };
    }
  }

  const cached = store.reverseGeocodedAddressLine?.trim();

  if (
    cached &&
    !looksLikeCoordinateAddressLine(cached) &&
    !isAddressPlaceholder(cached)
  ) {
    return { kind: 'address', query: cached };
  }

  return null;
}

export function canOpenVisitLogStoreLocation(store: Store): boolean {
  return resolveVisitLogStoreLocationQuery(store) !== null;
}

export function visitLogStoreLocationAccessibilityLabel(
  addressLine: string,
): string {
  const trimmed = addressLine.trim();
  return trimmed.length > 0 ? `Open ${trimmed} in Maps` : 'Open store location in Maps';
}
