import type { Store } from '@/types/store';
import {
  hasUsableStructuredAddress,
  resolveStoreDisplayAddressLine,
} from '@/utils/store-display-address-core';

export type VisitLogStoreIdentity = {
  addressLine: string;
  title: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripTrailingCommas(value: string): string {
  return value.replace(/,\s*$/g, '').trim();
}

function normalizeAddressTokenKey(value: string): string[] {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .sort();
}

export function addressTokensEquivalent(left: string, right: string): boolean {
  const leftTokens = normalizeAddressTokenKey(left);
  const rightTokens = normalizeAddressTokenKey(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return false;
  }

  if (leftTokens.length !== rightTokens.length) {
    return false;
  }

  return leftTokens.every((token, index) => token === rightTokens[index]);
}

export function dedupeRepeatedStreetFragments(line: string): string {
  let normalized = normalizeWhitespace(line);

  if (normalized.length === 0) {
    return normalized;
  }

  const words = normalized.split(' ');

  for (let len = Math.floor(words.length / 2); len >= 2; len -= 1) {
    const first = words.slice(0, len).join(' ');
    const second = words.slice(len, len * 2).join(' ');

    if (first.toLowerCase() === second.toLowerCase()) {
      const remainder = words.slice(len * 2).join(' ');
      return dedupeRepeatedStreetFragments(
        remainder.length > 0 ? `${first} ${remainder}` : first,
      );
    }
  }

  for (let phraseLen = Math.min(6, Math.floor(words.length / 2)); phraseLen >= 2; phraseLen -= 1) {
    for (let start = 0; start <= words.length - phraseLen * 2; start += 1) {
      const firstPhrase = words.slice(start, start + phraseLen).join(' ').toLowerCase();

      for (
        let duplicateAt = start + phraseLen;
        duplicateAt <= words.length - phraseLen;
        duplicateAt += 1
      ) {
        const secondPhrase = words
          .slice(duplicateAt, duplicateAt + phraseLen)
          .join(' ')
          .toLowerCase();

        if (firstPhrase !== secondPhrase) {
          continue;
        }

        const nextWords = [
          ...words.slice(0, duplicateAt),
          ...words.slice(duplicateAt + phraseLen),
        ];

        return dedupeRepeatedStreetFragments(nextWords.join(' '));
      }
    }
  }

  return normalized;
}

export function hasRealStoreName(
  store: Pick<Store, 'name' | 'addressLine1' | 'storeNumber'>,
): boolean {
  const trimmedName = store.name.trim();

  if (trimmedName.length === 0) {
    return false;
  }

  const streetLine = dedupeRepeatedStreetFragments(store.addressLine1.trim());

  if (streetLine.length === 0) {
    return true;
  }

  if (normalizeWhitespace(trimmedName).toLowerCase() === streetLine.toLowerCase()) {
    return false;
  }

  if (addressTokensEquivalent(trimmedName, streetLine)) {
    return false;
  }

  return true;
}

export function formatStructuredStoreMailingAddress(store: Store): string {
  if (!hasUsableStructuredAddress(store)) {
    return stripTrailingCommas(resolveStoreDisplayAddressLine(store));
  }

  const streetLine = dedupeRepeatedStreetFragments(store.addressLine1.trim());
  const line2 = store.addressLine2?.trim();

  const streetParts = [streetLine, line2].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  const streetSegment = streetParts.join(', ');

  const city = store.city.trim();
  const state = store.state.trim();
  const postal = store.postalCode.trim();

  const cityState = [city, state].filter(Boolean).join(', ');
  const locality = [cityState, postal].filter(Boolean).join(' ').trim();

  const segments = [streetSegment, locality].map(stripTrailingCommas).filter(Boolean);

  return segments.join(', ');
}

export function buildVisitLogStoreIdentity(store: Store): VisitLogStoreIdentity {
  const mailingAddress = formatStructuredStoreMailingAddress(store);
  const streetLine = dedupeRepeatedStreetFragments(store.addressLine1.trim());

  if (hasRealStoreName(store)) {
    return {
      title: store.name.trim(),
      addressLine: mailingAddress,
    };
  }

  const trimmedNumber = store.storeNumber?.trim();
  const title =
    streetLine.length > 0
      ? streetLine
      : trimmedNumber
        ? `Store ${trimmedNumber}`
        : mailingAddress.length > 0
          ? mailingAddress
          : 'Imported Store';

  return {
    title,
    addressLine: mailingAddress.length > 0 ? mailingAddress : title,
  };
}
