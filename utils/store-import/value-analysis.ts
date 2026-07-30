const US_STATE_ABBREVIATIONS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
]);

const US_STATE_NAMES = new Set([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
  'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
  'new hampshire', 'new jersey', 'new mexico', 'new york',
  'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon',
  'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
  'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
  'west virginia', 'wisconsin', 'wyoming', 'district of columbia',
]);

const STREET_SUFFIX_PATTERN =
  /\b(st|street|rd|road|ave|avenue|blvd|boulevard|drive|dr|ln|lane|hwy|highway|pkwy|parkway|trail|trl|court|ct|circle|cir|way|pl|place)\b/i;

const FULL_ADDRESS_PATTERN =
  /^.+,\s*.+,\s*[A-Za-z]{2,}\s+\d{5}(?:-\d{4})?$/;

export function sampleNonEmptyValues(
  rows: Record<string, string>[],
  column: string,
  limit = 5,
): string[] {
  const samples: string[] = [];

  for (const row of rows) {
    const value = row[column]?.trim();

    if (!value) {
      continue;
    }

    samples.push(value);

    if (samples.length >= limit) {
      break;
    }
  }

  return samples;
}

export function ratioMatching(values: string[], predicate: (value: string) => boolean): number {
  if (values.length === 0) {
    return 0;
  }

  const matches = values.filter(predicate).length;

  return matches / values.length;
}

export function looksLikeZip(value: string): boolean {
  return /^\d{5}(?:-\d{4})?$/.test(value.trim());
}

export function looksLikeState(value: string): boolean {
  const trimmed = value.trim();

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return US_STATE_ABBREVIATIONS.has(trimmed.toUpperCase());
  }

  return US_STATE_NAMES.has(trimmed.toLowerCase());
}

export function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) {
    return false;
  }

  return /[\d\s().+-]/.test(value);
}

export function looksLikeLatitude(value: string): boolean {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
}

export function looksLikeLongitude(value: string): boolean {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
}

export function looksLikeStreetAddress(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed.length < 5) {
    return false;
  }

  const hasStreetNumber = /\d/.test(trimmed);
  const hasSuffix = STREET_SUFFIX_PATTERN.test(trimmed);

  return hasStreetNumber && (hasSuffix || trimmed.includes(','));
}

export function looksLikeFullAddress(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed.includes(',')) {
    return false;
  }

  return FULL_ADDRESS_PATTERN.test(trimmed) || (
    looksLikeStreetAddress(trimmed) &&
    /,\s*.+,\s*[A-Za-z]{2,}/.test(trimmed) &&
    /\d{5}/.test(trimmed)
  );
}

export function looksLikeStoreNumber(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 20) {
    return false;
  }

  if (looksLikePhone(trimmed) || looksLikeStreetAddress(trimmed)) {
    return false;
  }

  if (/^0\d+$/.test(trimmed)) {
    return true;
  }

  if (looksLikeZip(trimmed)) {
    return false;
  }

  return /^[\dA-Za-z#-]+$/.test(trimmed);
}

export function looksLikeStoreName(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 80) {
    return false;
  }

  if (
    looksLikePhone(trimmed) ||
    looksLikeZip(trimmed) ||
    looksLikeLatitude(trimmed) ||
    looksLikeLongitude(trimmed) ||
    looksLikeStreetAddress(trimmed) ||
    looksLikeFullAddress(trimmed)
  ) {
    return false;
  }

  return /[A-Za-z]/.test(trimmed);
}

export function looksLikePersonName(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 60) {
    return false;
  }

  if (looksLikePhone(trimmed) || looksLikeStreetAddress(trimmed)) {
    return false;
  }

  const parts = trimmed.split(/\s+/);

  return parts.length >= 2 && parts.every((part) => /^[A-Za-z'.-]+$/.test(part));
}

export function uniquenessRatio(values: string[]): number {
  if (values.length === 0) {
    return 0;
  }

  const unique = new Set(values.map((value) => value.trim().toLowerCase()));

  return unique.size / values.length;
}

export function collectColumnSamples(
  rows: Record<string, string>[],
  column: string,
  sampleSize = 20,
): string[] {
  const samples: string[] = [];

  for (const row of rows) {
    const value = row[column]?.trim();

    if (!value) {
      continue;
    }

    samples.push(value);

    if (samples.length >= sampleSize) {
      break;
    }
  }

  return samples;
}
