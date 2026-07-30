const STREET_SUFFIX_REPLACEMENTS: Record<string, string> = {
  street: 'st',
  st: 'st',
  road: 'rd',
  rd: 'rd',
  avenue: 'ave',
  ave: 'ave',
  boulevard: 'blvd',
  blvd: 'blvd',
  drive: 'dr',
  dr: 'dr',
  lane: 'ln',
  ln: 'ln',
  highway: 'hwy',
  hwy: 'hwy',
  parkway: 'pkwy',
  pkwy: 'pkwy',
  trail: 'trl',
  trl: 'trl',
  court: 'ct',
  ct: 'ct',
  circle: 'cir',
  cir: 'cir',
  place: 'pl',
  pl: 'pl',
};

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeZipForMatching(value: string): string {
  const digits = value.replace(/\D/g, '');

  return digits.slice(0, 5);
}

export function normalizeStateForMatching(value: string): string {
  const trimmed = value.trim();

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return trimmed.toLowerCase();
}

export function normalizeStreetSuffix(token: string): string {
  const lower = token.toLowerCase();

  return STREET_SUFFIX_REPLACEMENTS[lower] ?? lower;
}

export function normalizeAddressToken(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((token) => normalizeStreetSuffix(token))
    .join(' ')
    .trim();
}

export function normalizeFullAddressForMatching(value: string): string {
  return normalizeAddressToken(value);
}

export function normalizeAddressComponentsForMatching(input: {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}): string {
  const zip = normalizeZipForMatching(input.postalCode);
  const state = normalizeStateForMatching(input.state);

  return [
    normalizeAddressToken(input.addressLine1),
    normalizeAddressToken(input.city),
    state,
    zip,
  ]
    .filter(Boolean)
    .join('|');
}

export function buildFormattedAddress(input: {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}): string {
  const parts: string[] = [];

  if (input.addressLine1.trim()) {
    parts.push(input.addressLine1.trim());
  }

  const locality = [input.city.trim(), input.state.trim(), input.postalCode.trim()]
    .filter(Boolean)
    .join(', ')
    .replace(/,\s*,/g, ',');

  if (locality) {
    parts.push(locality);
  }

  return parts.join(', ');
}

export type ParsedFullAddress = {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
};

export function parseFullAddress(fullAddress: string): ParsedFullAddress | null {
  const trimmed = fullAddress.trim();

  const strictMatch = trimmed.match(/^(.+?),\s*([^,]+),\s*([A-Za-z]{2,})\s+(\d{5}(?:-\d{4})?)$/);

  if (strictMatch) {
    return {
      addressLine1: strictMatch[1]?.trim() ?? '',
      city: strictMatch[2]?.trim() ?? '',
      state: strictMatch[3]?.trim() ?? '',
      postalCode: strictMatch[4]?.trim() ?? '',
    };
  }

  const parts = trimmed.split(',').map((part) => part.trim());

  if (parts.length < 2) {
    return null;
  }

  const lastPart = parts[parts.length - 1] ?? '';
  const stateZipMatch = lastPart.match(/^([A-Za-z]{2,})\s+(\d{5}(?:-\d{4})?)$/);

  if (stateZipMatch && parts.length >= 3) {
    return {
      addressLine1: parts.slice(0, -2).join(', '),
      city: parts[parts.length - 2] ?? '',
      state: stateZipMatch[1] ?? '',
      postalCode: stateZipMatch[2] ?? '',
    };
  }

  return {
    addressLine1: parts[0] ?? trimmed,
    city: parts[1] ?? '',
    state: parts[2] ?? '',
    postalCode: parts[3] ?? '',
  };
}
