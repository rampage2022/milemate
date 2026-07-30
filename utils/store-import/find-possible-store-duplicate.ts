import type { Store } from '@/types/store';
import type { DuplicateMatch, ResolvedImportRow } from '@/types/store-import';
import {
  normalizeAddressComponentsForMatching,
  normalizeFullAddressForMatching,
  normalizeWhitespace,
} from '@/utils/store-import/address-utils';

function normalizeStoreNumber(value: string | undefined): string {
  return normalizeWhitespace(value ?? '').toLowerCase();
}

export function findPossibleStoreDuplicate(
  resolved: ResolvedImportRow,
  existingStores: Store[],
): DuplicateMatch | null {
  const storeNumber = normalizeStoreNumber(resolved.storeNumber);

  if (storeNumber) {
    const byNumber = existingStores.find(
      (store) => normalizeStoreNumber(store.storeNumber) === storeNumber,
    );

    if (byNumber) {
      return {
        confidence: 'confident',
        existingStore: byNumber,
        reason: 'storeNumber',
      };
    }
  }

  const fullAddressKey = resolved.fullAddressText
    ? normalizeFullAddressForMatching(resolved.fullAddressText)
    : normalizeFullAddressForMatching(resolved.formattedAddress);

  if (fullAddressKey) {
    const byFullAddress = existingStores.find((store) => {
      const existingFull = normalizeFullAddressForMatching(
        `${store.addressLine1}, ${store.city}, ${store.state} ${store.postalCode}`,
      );

      return existingFull === fullAddressKey;
    });

    if (byFullAddress) {
      return {
        confidence: 'confident',
        existingStore: byFullAddress,
        reason: 'fullAddress',
      };
    }
  }

  const componentKey = normalizeAddressComponentsForMatching({
    addressLine1: resolved.addressLine1,
    city: resolved.city,
    state: resolved.state,
    postalCode: resolved.postalCode,
  });

  if (componentKey.replace(/\|/g, '').length > 0) {
    const matches = existingStores.filter((store) => {
      const existingKey = normalizeAddressComponentsForMatching({
        addressLine1: store.addressLine1,
        city: store.city,
        state: store.state,
        postalCode: store.postalCode,
      });

      return existingKey === componentKey;
    });

    if (matches.length === 1) {
      return {
        confidence: 'confident',
        existingStore: matches[0]!,
        reason: 'addressComponents',
      };
    }

    if (matches.length > 1) {
      return {
        confidence: 'possible',
        existingStore: matches[0]!,
        reason: 'addressComponents',
      };
    }
  }

  const partialMatches = existingStores.filter((store) => {
    if (!resolved.addressLine1.trim()) {
      return false;
    }

    const street = normalizeFullAddressForMatching(resolved.addressLine1);
    const existingStreet = normalizeFullAddressForMatching(store.addressLine1);

    return street.length > 0 && street === existingStreet;
  });

  if (partialMatches.length === 1) {
    return {
      confidence: 'possible',
      existingStore: partialMatches[0]!,
      reason: 'addressComponents',
    };
  }

  return null;
}

export function findDuplicateInImportBatch(
  resolved: ResolvedImportRow,
  priorRows: ResolvedImportRow[],
): ResolvedImportRow | null {
  for (const prior of priorRows) {
    if (prior.validationStatus === 'invalid') {
      continue;
    }

    if (
      resolved.storeNumber &&
      prior.storeNumber &&
      normalizeStoreNumber(resolved.storeNumber) === normalizeStoreNumber(prior.storeNumber)
    ) {
      return prior;
    }

    const resolvedKey = normalizeAddressComponentsForMatching({
      addressLine1: resolved.addressLine1,
      city: resolved.city,
      state: resolved.state,
      postalCode: resolved.postalCode,
    });

    const priorKey = normalizeAddressComponentsForMatching({
      addressLine1: prior.addressLine1,
      city: prior.city,
      state: prior.state,
      postalCode: prior.postalCode,
    });

    if (resolvedKey && resolvedKey === priorKey) {
      return prior;
    }
  }

  return null;
}
