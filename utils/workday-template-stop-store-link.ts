import type { Store } from '@/types/store';
import type { ResolvedImportRow } from '@/types/store-import';
import type { WorkdayTemplateStop } from '@/types/workday-template';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { findPossibleStoreDuplicate } from '@/utils/store-import/find-possible-store-duplicate';
import {
  normalizeFullAddressForMatching,
  normalizeWhitespace,
} from '@/utils/store-import/address-utils';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';
import { normalizeWorkdayTemplateAddress } from '@/utils/workday-template-utils';

export type WorkdayTemplateStopLinkMethod =
  | 'direct'
  | 'import_alias'
  | 'duplicate_address'
  | 'duplicate_store_number'
  | 'name_and_address'
  | 'created_store'
  | 'route_only'
  | 'unresolved';

export type WorkdayTemplateStopLinkResult = {
  canonicalStoreId: string | null;
  linkMethod: WorkdayTemplateStopLinkMethod;
  createdStore?: Store;
  stop: WorkdayTemplateStop;
  stopChanged: boolean;
};

function parseAddressParts(address: string): {
  addressLine1: string;
  city: string;
  postalCode: string;
  state: string;
} {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const addressLine1 = parts[0] ?? '';
  const city = parts[1] ?? '';
  const statePostal = parts[2] ?? '';
  const [state = '', ...postalParts] = statePostal.split(/\s+/);

  return {
    addressLine1,
    city,
    postalCode: postalParts.join(' '),
    state,
  };
}

function extractStoreNumberFromStop(stop: WorkdayTemplateStop): string | undefined {
  const nameMatch = stop.displayName.match(/#\s*(\d+)/);

  if (nameMatch?.[1]) {
    return nameMatch[1];
  }

  return undefined;
}

export function workdayTemplateStopToResolvedImportRow(
  stop: WorkdayTemplateStop,
): ResolvedImportRow {
  const parts = parseAddressParts(stop.address);
  const formattedAddress = stop.address.trim();

  return {
    rowNumber: 0,
    storeNumber: extractStoreNumberFromStop(stop),
    storeName: stop.displayName.trim(),
    addressLine1: parts.addressLine1,
    city: parts.city,
    state: parts.state,
    postalCode: parts.postalCode,
    fullAddressText: normalizeFullAddressForMatching(formattedAddress),
    managerName: undefined,
    managerPhone: undefined,
    latitude: stop.latitude,
    longitude: stop.longitude,
    validationStatus: 'valid',
    messages: [],
    displayTitle: stop.displayName,
    formattedAddress,
  };
}

export function isRouteOnlyWorkdayTemplateStop(stop: WorkdayTemplateStop): boolean {
  if (stop.sourceType === 'store') {
    return false;
  }

  if (stop.storeId?.startsWith('store-template-')) {
    return true;
  }

  if (stop.sourceType === 'manual' && !stop.storeId?.trim()) {
    return true;
  }

  return false;
}

export function hasSufficientStoreSnapshotForCreation(stop: WorkdayTemplateStop): boolean {
  const name = stop.displayName.trim();
  const address = stop.address.trim();

  if (name.length === 0 || address.length < 8) {
    return false;
  }

  const parts = parseAddressParts(address);

  return parts.addressLine1.length > 0 && parts.city.length > 0;
}

function findStoreByNormalizedSnapshotAddress(
  stop: WorkdayTemplateStop,
  stores: Store[],
): Store | null {
  const normalizedStopAddress = normalizeWorkdayTemplateAddress(stop.address);

  if (!normalizedStopAddress) {
    return null;
  }

  const matches = stores.filter((store) => {
    const storeAddress = normalizeWorkdayTemplateAddress(
      `${store.addressLine1}, ${store.city}, ${store.state} ${store.postalCode}`,
    );

    return storeAddress === normalizedStopAddress;
  });

  return matches.length === 1 ? matches[0]! : null;
}

function findStoreByNameAndNormalizedAddress(
  stop: WorkdayTemplateStop,
  stores: Store[],
): Store | null {
  const stopName = normalizeWhitespace(stop.displayName).toLowerCase();
  const normalizedStopAddress = normalizeWorkdayTemplateAddress(stop.address);

  if (!stopName || !normalizedStopAddress) {
    return null;
  }

  const matches = stores.filter((store) => {
    const storeName = normalizeWhitespace(getStoreDisplayName(store)).toLowerCase();
    const storeAddress = normalizeWorkdayTemplateAddress(
      `${store.addressLine1}, ${store.city}, ${store.state} ${store.postalCode}`,
    );

    return storeName === stopName && storeAddress === normalizedStopAddress;
  });

  return matches.length === 1 ? matches[0]! : null;
}

function createStoreIdFromSnapshot(): string {
  return `store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createStoreFromWorkdayTemplateStop(
  stop: WorkdayTemplateStop,
  storeId: string,
): Store {
  const now = Date.now();
  const parts = parseAddressParts(stop.address);
  const storeNumber = extractStoreNumberFromStop(stop);

  return {
    id: storeId,
    name: stop.displayName.trim(),
    storeNumber,
    addressLine1: parts.addressLine1 || stop.displayName.trim(),
    city: parts.city || 'Unknown',
    state: parts.state || 'NA',
    postalCode: parts.postalCode,
    latitude: stop.latitude,
    longitude: stop.longitude,
    createdAt: now,
    updatedAt: now,
  };
}

function linkStopToCanonicalStore(
  stop: WorkdayTemplateStop,
  canonicalStoreId: string,
): WorkdayTemplateStop {
  return {
    ...stop,
    storeId: canonicalStoreId,
    sourceType: stop.sourceType === 'manual' ? 'store' : (stop.sourceType ?? 'store'),
  };
}

export function reconcileWorkdayTemplateStopAgainstStores(input: {
  stop: WorkdayTemplateStop;
  storeIdRemap: ReadonlyMap<string, string>;
  stores: Store[];
}): WorkdayTemplateStopLinkResult {
  const { stop, storeIdRemap, stores } = input;
  const storesById = new Map(stores.map((store) => [store.id, store]));

  if (isRouteOnlyWorkdayTemplateStop(stop)) {
    return {
      canonicalStoreId: null,
      linkMethod: 'route_only',
      stop,
      stopChanged: false,
    };
  }

  const originalStoreId = stop.storeId?.trim();

  if (originalStoreId && storesById.has(originalStoreId)) {
    const canonical = storesById.get(originalStoreId)!;
    const nextStop = linkStopToCanonicalStore(stop, canonical.id);

    return {
      canonicalStoreId: canonical.id,
      linkMethod: 'direct',
      stop: nextStop,
      stopChanged: nextStop.storeId !== stop.storeId,
    };
  }

  const remappedId = originalStoreId
    ? resolveRemappedStoreId(originalStoreId, storeIdRemap)
    : null;

  if (remappedId && storesById.has(remappedId)) {
    const canonical = storesById.get(remappedId)!;
    const nextStop = linkStopToCanonicalStore(stop, canonical.id);

    return {
      canonicalStoreId: canonical.id,
      linkMethod:
        originalStoreId && originalStoreId !== remappedId ? 'import_alias' : 'direct',
      stop: nextStop,
      stopChanged: nextStop.storeId !== stop.storeId,
    };
  }

  const importRow = workdayTemplateStopToResolvedImportRow(stop);
  const duplicateMatch = findPossibleStoreDuplicate(importRow, stores);

  if (duplicateMatch?.confidence === 'confident') {
    const canonical = duplicateMatch.existingStore;
    const method: WorkdayTemplateStopLinkMethod =
      duplicateMatch.reason === 'storeNumber'
        ? 'duplicate_store_number'
        : 'duplicate_address';
    const nextStop = linkStopToCanonicalStore(stop, canonical.id);

    return {
      canonicalStoreId: canonical.id,
      linkMethod: method,
      stop: nextStop,
      stopChanged: nextStop.storeId !== stop.storeId,
    };
  }

  const bySnapshotAddress = findStoreByNormalizedSnapshotAddress(stop, stores);

  if (bySnapshotAddress) {
    const nextStop = linkStopToCanonicalStore(stop, bySnapshotAddress.id);

    return {
      canonicalStoreId: bySnapshotAddress.id,
      linkMethod: 'duplicate_address',
      stop: nextStop,
      stopChanged: nextStop.storeId !== stop.storeId,
    };
  }

  const byNameAndAddress = findStoreByNameAndNormalizedAddress(stop, stores);

  if (byNameAndAddress) {
    const nextStop = linkStopToCanonicalStore(stop, byNameAndAddress.id);

    return {
      canonicalStoreId: byNameAndAddress.id,
      linkMethod: 'name_and_address',
      stop: nextStop,
      stopChanged: nextStop.storeId !== stop.storeId,
    };
  }

  if (hasSufficientStoreSnapshotForCreation(stop) && stop.sourceType === 'store') {
    const newStoreId = createStoreIdFromSnapshot();
    const createdStore = createStoreFromWorkdayTemplateStop(stop, newStoreId);
    const nextStop: WorkdayTemplateStop = {
      ...stop,
      storeId: createdStore.id,
      sourceType: 'store',
      displayName: getStoreDisplayName(createdStore),
      address: `${createdStore.addressLine1}, ${createdStore.city}, ${createdStore.state} ${createdStore.postalCode}`.trim(),
      latitude: createdStore.latitude ?? stop.latitude,
      longitude: createdStore.longitude ?? stop.longitude,
    };

    return {
      canonicalStoreId: createdStore.id,
      createdStore,
      linkMethod: 'created_store',
      stop: nextStop,
      stopChanged: true,
    };
  }

  return {
    canonicalStoreId: null,
    linkMethod: 'unresolved',
    stop,
    stopChanged: false,
  };
}
