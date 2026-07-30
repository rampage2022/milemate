import * as Location from 'expo-location';

import { upsertStore } from '@/services/stores';
import type { Store } from '@/types/store';
import {
  buildReadableLineFromGeocodeResult,
  looksLikeCoordinateAddressLine,
  storeNeedsReverseGeocode,
} from '@/utils/store-display-address-core';

export {
  ADDRESS_UNAVAILABLE_LABEL,
  buildReadableLineFromGeocodeResult,
  hasUsableStructuredAddress,
  looksLikeCoordinateAddressLine,
  resolveStoreDisplayAddressLine,
} from '@/utils/store-display-address-core';

const inFlightReverseGeocode = new Map<string, Promise<Store>>();

function logStoreAddressDev(message: string, detail?: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (detail !== undefined) {
      console.log(`[store-display-address] ${message}`, detail);
    } else {
      console.log(`[store-display-address] ${message}`);
    }
  }
}

async function reverseGeocodeStoreRecord(store: Store): Promise<Store> {
  if (!storeNeedsReverseGeocode(store)) {
    return store;
  }

  const latitude = store.latitude!;
  const longitude = store.longitude!;

  logStoreAddressDev('reverse geocode started', {
    storeId: store.id,
    latitude,
    longitude,
  });

  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    logStoreAddressDev('reverse geocode result', {
      storeId: store.id,
      resultCount: results.length,
      firstResult: results[0] ?? null,
    });

    const first = results[0];

    if (!first) {
      logStoreAddressDev('reverse geocode empty result', { storeId: store.id });
      return store;
    }

    const formattedLine = buildReadableLineFromGeocodeResult(first);

    logStoreAddressDev('reverse geocode formatted line', {
      storeId: store.id,
      formattedLine,
    });

    if (!formattedLine || looksLikeCoordinateAddressLine(formattedLine)) {
      return store;
    }

    const updated: Store = {
      ...store,
      reverseGeocodedAddressLine: formattedLine,
      updatedAt: Date.now(),
    };

    await upsertStore(updated);

    logStoreAddressDev('reverse geocode persisted', {
      storeId: store.id,
      reverseGeocodedAddressLine: formattedLine,
    });

    return updated;
  } catch (error) {
    logStoreAddressDev('reverse geocode error', {
      storeId: store.id,
      latitude,
      longitude,
      error,
    });

    return store;
  }
}

export async function ensureStoreReverseGeocodedAddress(
  store: Store,
): Promise<Store> {
  if (!storeNeedsReverseGeocode(store)) {
    return store;
  }

  const inFlight = inFlightReverseGeocode.get(store.id);

  if (inFlight) {
    return inFlight;
  }

  const work = reverseGeocodeStoreRecord(store).finally(() => {
    inFlightReverseGeocode.delete(store.id);
  });

  inFlightReverseGeocode.set(store.id, work);

  return work;
}

/** Backfill readable addresses for existing stores (e.g. on route load). */
export async function ensureReadableAddressesForStores(
  stores: Store[],
): Promise<Record<string, Store>> {
  const byId: Record<string, Store> = {};

  for (const store of stores) {
    byId[store.id] = store;
  }

  const needing = stores.filter(storeNeedsReverseGeocode);

  if (needing.length === 0) {
    return byId;
  }

  logStoreAddressDev('backfill batch started', {
    count: needing.length,
    storeIds: needing.map((store) => store.id),
  });

  await Promise.all(
    needing.map(async (store) => {
      const updated = await ensureStoreReverseGeocodedAddress(store);
      byId[updated.id] = updated;
    }),
  );

  return byId;
}

/** @internal Test helper */
export function __resetStoreDisplayAddressInFlightForTests(): void {
  inFlightReverseGeocode.clear();
}
