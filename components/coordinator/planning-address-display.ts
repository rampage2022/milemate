import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import { resolveStoreDisplayAddressLine } from '@/utils/store-display-address-core';

const STREET_SUFFIX_PATTERN =
  /\b(rd|road|st|street|ln|lane|ave|avenue|blvd|boulevard|dr|drive|pkwy|parkway|way|ct|court|cir|circle|hwy|highway|pl|place|trl|trail)\b/i;

function normalizeAddressPart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function tokenize(value: string): string[] {
  return normalizeAddressPart(value).split(' ').filter(Boolean);
}

function isDuplicateStreetReference(name: string, streetLine: string): boolean {
  const normalizedName = normalizeAddressPart(name);
  const normalizedStreet = normalizeAddressPart(streetLine);

  if (!normalizedName || !normalizedStreet) {
    return false;
  }

  return (
    normalizedName === normalizedStreet ||
    normalizedStreet.includes(normalizedName) ||
    normalizedName.includes(normalizedStreet)
  );
}

function hasRepeatedAddressTokens(value: string): boolean {
  const words = tokenize(value);

  if (words.length < 3) {
    return false;
  }

  for (let size = 1; size <= Math.floor(words.length / 2); size += 1) {
    for (let start = 0; start <= words.length - size * 2; start += 1) {
      const first = words.slice(start, start + size).join(' ');
      const second = words.slice(start + size, start + size * 2).join(' ');

      if (first.length > 0 && first === second) {
        return true;
      }
    }
  }

  const uniqueWords = new Set(words);

  if (words.length >= 4 && uniqueWords.size <= Math.ceil(words.length / 2)) {
    return true;
  }

  return false;
}

function looksLikeStreetAddress(value: string): boolean {
  const normalized = normalizeAddressPart(value);

  if (!normalized) {
    return false;
  }

  if (/^\d/.test(normalized)) {
    return true;
  }

  return STREET_SUFFIX_PATTERN.test(normalized);
}

function containsDuplicatedStreetLine(name: string, streetLine: string): boolean {
  const normalizedName = normalizeAddressPart(name);
  const normalizedStreet = normalizeAddressPart(streetLine);

  if (!normalizedName || !normalizedStreet) {
    return false;
  }

  const doubledStreet = `${normalizedStreet} ${normalizedStreet}`;

  return normalizedName.includes(doubledStreet);
}

function isUsableBusinessName(name: string, streetLine: string): boolean {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return false;
  }

  if (isDuplicateStreetReference(trimmedName, streetLine)) {
    return false;
  }

  if (containsDuplicatedStreetLine(trimmedName, streetLine)) {
    return false;
  }

  if (hasRepeatedAddressTokens(trimmedName)) {
    return false;
  }

  if (looksLikeStreetAddress(trimmedName)) {
    return false;
  }

  return true;
}

function restoreStreetLineCasing(source: string, normalizedWords: string[]): string {
  const sourceWords = source.trim().split(/\s+/).filter(Boolean);
  const restored: string[] = [];
  let sourceIndex = 0;

  for (const word of normalizedWords) {
    while (
      sourceIndex < sourceWords.length &&
      normalizeAddressPart(sourceWords[sourceIndex]) !== word
    ) {
      sourceIndex += 1;
    }

    if (sourceIndex < sourceWords.length) {
      restored.push(sourceWords[sourceIndex]);
      sourceIndex += 1;
      continue;
    }

    restored.push(word);
  }

  return restored.join(' ');
}

function collapseMalformedStreetLine(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || !hasRepeatedAddressTokens(trimmed)) {
    return trimmed;
  }

  const words = tokenize(trimmed);

  for (let size = Math.floor(words.length / 2); size >= 1; size -= 1) {
    for (let start = 0; start <= words.length - size * 2; start += 1) {
      const first = words.slice(start, start + size).join(' ');
      const second = words.slice(start + size, start + size * 2).join(' ');

      if (first !== second) {
        continue;
      }

      const collapsedWords = words.slice(0, start + size);
      let trailingIndex = start + size * 2;

      if (
        trailingIndex < words.length &&
        words.length - trailingIndex === 1 &&
        words[trailingIndex] === words[0]
      ) {
        trailingIndex += 1;
      }

      if (trailingIndex === words.length) {
        return restoreStreetLineCasing(trimmed, collapsedWords);
      }
    }
  }

  return trimmed;
}

function normalizePlanningStreetLine(value: string): string {
  return collapseMalformedStreetLine(value.trim());
}

function buildStreetLine(store: Store): string {
  const displayLine = resolveStoreDisplayAddressLine(store);
  const rawStreetLine = [displayLine, store.addressLine2]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(', ')
    .trim();

  return normalizePlanningStreetLine(rawStreetLine);
}

function buildCityState(store: Store): string {
  const cityState = [store.city, store.state]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(', ')
    .trim();
  const postal =
    typeof store.postalCode === 'string' && store.postalCode.trim().length > 0
      ? store.postalCode.trim()
      : '';

  if (cityState && postal) {
    return `${cityState} ${postal}`;
  }

  return cityState || postal;
}

export type PlanningStopDisplay = {
  title: string;
  subtitle: string;
};

/** Display-only stop lines for planning lists (no postal code, no duplicate street). */
export function formatPlanningStopDisplay(store: Store): PlanningStopDisplay {
  const streetLine = buildStreetLine(store);
  const cityState = buildCityState(store);
  const name = store.name.trim();

  if (isUsableBusinessName(name, streetLine)) {
    const subtitleParts = [streetLine, cityState].filter((part) => part.length > 0);

    return {
      title: name,
      subtitle: subtitleParts.join(', '),
    };
  }

  return {
    title: streetLine || name || 'Stop',
    subtitle: cityState,
  };
}

/** One-line stop address for compact route lists (street, or street · city). */
export function formatPlanningStopAddressLine(store: Store): string {
  const { subtitle, title } = formatPlanningStopDisplay(store);

  if (subtitle.length === 0) {
    return title;
  }

  const commaIndex = subtitle.indexOf(',');

  if (commaIndex === -1) {
    return subtitle;
  }

  const street = subtitle.slice(0, commaIndex).trim();
  const afterStreet = subtitle.slice(commaIndex + 1).trim();
  const city = afterStreet.split(',')[0]?.trim() ?? afterStreet;

  if (street.length > 0 && city.length > 0) {
    return `${street} · ${city}`;
  }

  return subtitle;
}

/** Display-only address for coordinator planning screens (no postal code). */
export function formatPlanningStoreAddress(store: Store): string {
  const { subtitle, title } = formatPlanningStopDisplay(store);

  if (subtitle.length === 0) {
    return title;
  }

  return `${title}, ${subtitle}`;
}

/** Display-only route address for coordinator planning screens (no postal code). */
export function formatPlanningRouteAddress(formattedAddress: string): string {
  return formattedAddress
    .replace(/\n/g, ', ')
    .replace(/,?\s+\d{5}(?:-\d{4})?\s*$/, '')
    .replace(/,\s*$/, '')
    .trim();
}

export type RouteLocationDisplay = {
  primary: string;
  secondary: string;
};

export function formatPlanningRouteLocationDisplay(
  location: RouteLocation | null,
  placeholder: string,
): RouteLocationDisplay {
  if (!location) {
    return { primary: placeholder, secondary: '' };
  }

  const formatted = formatPlanningRouteAddress(location.formattedAddress);
  const parts = formatted
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const streetFromFormatted = normalizePlanningStreetLine(parts[0] ?? formatted);
  const remainder = parts.slice(1).join(', ');
  const name = location.name?.trim() ?? '';

  if (name.length > 0 && isUsableBusinessName(name, streetFromFormatted)) {
    const subtitleParts = [streetFromFormatted, remainder].filter((part) => part.length > 0);

    return {
      primary: name,
      secondary: subtitleParts.join(', '),
    };
  }

  return {
    primary: streetFromFormatted,
    secondary: remainder,
  };
}

/** Home status card: one street line + city/state (no duplicated street tokens). */
export function formatHomeStartLocationLines(
  formattedAddress: string,
  name?: string | null,
): { localityLine: string; streetLine: string } {
  const { primary, secondary } = formatPlanningRouteLocationDisplay(
    {
      id: 'home-start-display',
      formattedAddress,
      name: name?.trim() || undefined,
      latitude: 0,
      longitude: 0,
      source: 'profile',
    },
    'Not set',
  );

  return {
    streetLine: primary,
    localityLine: secondary,
  };
}
