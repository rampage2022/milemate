import type {
  ImportRowValidationStatus,
  ResolvedImportRow,
  StoreImportField,
  StoreImportMapping,
} from '@/types/store-import';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import {
  buildFormattedAddress,
  parseFullAddress,
} from '@/utils/store-import/address-utils';
import {
  hasValidImportCoordinates,
  resolveImportCoordinates,
  sanitizeImportedAddressComponent,
} from '@/utils/store-import/normalize-import-coordinates';
import {
  looksLikeFullAddress,
  looksLikeLatitude,
  looksLikeLongitude,
} from '@/utils/store-import/value-analysis';
import { looksLikeCoordinateAddressLine } from '@/utils/store-display-address-core';

function findColumnForField(
  mapping: StoreImportMapping,
  field: StoreImportField,
): string | undefined {
  return Object.entries(mapping).find(([, mappedField]) => mappedField === field)?.[0];
}

function readMappedValue(
  row: Record<string, string>,
  mapping: StoreImportMapping,
  field: StoreImportField,
): string {
  const column = findColumnForField(mapping, field);

  if (!column) {
    return '';
  }

  return row[column]?.trim() ?? '';
}

function hasUsableImportedAddress(input: {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  fullAddressText?: string;
}): boolean {
  const street = sanitizeImportedAddressComponent(input.addressLine1);
  const city = sanitizeImportedAddressComponent(input.city);
  const state = sanitizeImportedAddressComponent(input.state);
  const postalCode = sanitizeImportedAddressComponent(input.postalCode);
  const fullAddress = sanitizeImportedAddressComponent(input.fullAddressText ?? '');

  if (fullAddress.length > 0 && !looksLikeCoordinateAddressLine(fullAddress)) {
    return true;
  }

  if (street.length === 0) {
    return false;
  }

  if (!looksLikeCoordinateAddressLine(street)) {
    return true;
  }

  return city.length > 0 || state.length > 0 || postalCode.length > 0;
}

export function resolveImportedStoreRow(
  row: Record<string, string>,
  rowNumber: number,
  mapping: StoreImportMapping,
): ResolvedImportRow {
  const storeNumber = readMappedValue(row, mapping, 'storeNumber');
  const storeName = readMappedValue(row, mapping, 'storeName');
  const fullAddress = readMappedValue(row, mapping, 'fullAddress');
  const address = readMappedValue(row, mapping, 'address');
  const city = readMappedValue(row, mapping, 'city');
  const state = readMappedValue(row, mapping, 'state');
  const postalCode = readMappedValue(row, mapping, 'zip');
  const managerName = readMappedValue(row, mapping, 'manager');
  const managerPhone = readMappedValue(row, mapping, 'phone');
  const latitudeRaw = readMappedValue(row, mapping, 'latitude');
  const longitudeRaw = readMappedValue(row, mapping, 'longitude');

  let addressLine1 = address;
  let resolvedCity = city;
  let resolvedState = state;
  let resolvedPostalCode = postalCode;
  let fullAddressText: string | undefined;

  if (fullAddress) {
    fullAddressText = fullAddress;
    const parsed = parseFullAddress(fullAddress);

    if (parsed) {
      if (!addressLine1) {
        addressLine1 = parsed.addressLine1;
      }

      if (!resolvedCity) {
        resolvedCity = parsed.city;
      }

      if (!resolvedState) {
        resolvedState = parsed.state;
      }

      if (!resolvedPostalCode) {
        resolvedPostalCode = parsed.postalCode;
      }
    } else if (!addressLine1) {
      addressLine1 = fullAddress;
    }
  } else if (addressLine1 && looksLikeFullAddress(addressLine1)) {
    fullAddressText = addressLine1;
    const parsed = parseFullAddress(addressLine1);

    if (parsed) {
      addressLine1 = parsed.addressLine1;
      resolvedCity = resolvedCity || parsed.city;
      resolvedState = resolvedState || parsed.state;
      resolvedPostalCode = resolvedPostalCode || parsed.postalCode;
    }
  }

  const { latitude, longitude } = resolveImportCoordinates({
    row,
    mappedLatitude: latitudeRaw,
    mappedLongitude: longitudeRaw,
    addressLine1,
    fullAddressText,
  });

  addressLine1 = sanitizeImportedAddressComponent(addressLine1);
  resolvedCity = sanitizeImportedAddressComponent(resolvedCity);
  resolvedState = sanitizeImportedAddressComponent(resolvedState);
  resolvedPostalCode = sanitizeImportedAddressComponent(resolvedPostalCode);
  fullAddressText = fullAddressText
    ? sanitizeImportedAddressComponent(fullAddressText)
    : undefined;

  const messages: string[] = [];
  let validationStatus: ImportRowValidationStatus = 'valid';

  if (latitudeRaw && (latitude === undefined || !looksLikeLatitude(latitudeRaw))) {
    messages.push('Invalid latitude');
    validationStatus = 'invalid';
  }

  if (longitudeRaw && (longitude === undefined || !looksLikeLongitude(longitudeRaw))) {
    messages.push('Invalid longitude');
    validationStatus = 'invalid';
  }

  const hasCoordinates = hasValidImportCoordinates({ latitude, longitude });
  const hasUsableAddress = hasUsableImportedAddress({
    addressLine1,
    city: resolvedCity,
    state: resolvedState,
    postalCode: resolvedPostalCode,
    fullAddressText,
  });

  const hasFullAddress = Boolean(fullAddressText?.trim());
  const hasStreet = Boolean(addressLine1.trim());
  const hasCity = Boolean(resolvedCity.trim());
  const hasState = Boolean(resolvedState.trim());
  const hasZip = Boolean(resolvedPostalCode.trim());
  const hasLocality = hasCity || hasState || hasZip;

  if (!hasUsableAddress && !hasCoordinates) {
    messages.push('Missing usable address or coordinates');
    validationStatus = 'invalid';
  } else if (hasCoordinates && !hasUsableAddress) {
    messages.push('Coordinates only; street address will be resolved from location');
    if (validationStatus !== 'invalid') {
      validationStatus = 'warning';
    }
  } else if (!hasFullAddress && !hasStreet && hasCoordinates) {
    if (validationStatus !== 'invalid') {
      validationStatus = 'warning';
    }
  } else if (hasFullAddress && !hasStreet && !hasLocality) {
    messages.push('Full address could not be parsed into usable parts');
    if (validationStatus !== 'invalid') {
      validationStatus = 'warning';
    }
  } else if (hasStreet && !hasLocality && !hasFullAddress) {
    messages.push('Street address has no city, state, or ZIP');
    if (validationStatus !== 'invalid') {
      validationStatus = 'warning';
    }
  }

  const formattedAddress = hasFullAddress
    ? fullAddressText ?? buildFormattedAddress({
        addressLine1,
        city: resolvedCity,
        state: resolvedState,
        postalCode: resolvedPostalCode,
      })
    : buildFormattedAddress({
        addressLine1,
        city: resolvedCity,
        state: resolvedState,
        postalCode: resolvedPostalCode,
      });

  const displayTitle = getStoreDisplayName({
    name: storeName,
    storeNumber: storeNumber || undefined,
    addressLine1,
  });

  if (validationStatus === 'valid' && messages.length === 0 && hasStreet && !hasLocality) {
    validationStatus = 'warning';
  }

  return {
    rowNumber,
    storeNumber: storeNumber || undefined,
    storeName: storeName || undefined,
    addressLine1,
    city: resolvedCity,
    state: resolvedState,
    postalCode: resolvedPostalCode,
    fullAddressText,
    managerName: managerName || undefined,
    managerPhone: managerPhone || undefined,
    latitude,
    longitude,
    validationStatus,
    messages,
    displayTitle,
    formattedAddress,
  };
}

export function validateImportedStoreRow(resolved: ResolvedImportRow): ResolvedImportRow {
  return resolved;
}
