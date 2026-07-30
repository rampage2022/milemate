import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORE_ORDERS_STORAGE_KEY } from '@/services/store-orders';
import { STORE_ORDER_DELIVERY_CHECKS_STORAGE_KEY } from '@/services/store-order-delivery-checks';
import { getStores } from '@/services/stores';
import {
  describeStoreOrderRecordShape,
  inferOrderTimestampMs,
  isCurrentSchemaStoreOrder,
  orderRecordHasNote,
} from '@/utils/store-order-validation';

export const ORDER_STORAGE_CURRENT_KEY = STORE_ORDERS_STORAGE_KEY;

export const ORDER_STORAGE_RELATED_KEYS = [
  STORE_ORDERS_STORAGE_KEY,
  STORE_ORDER_DELIVERY_CHECKS_STORAGE_KEY,
] as const;

/** Keys that may have held orders in earlier builds (none found in repo history). */
export const ORDER_STORAGE_LEGACY_KEY_CANDIDATES = [
  '@milemate/orders',
  '@milemate/store-order-history',
  '@milemate/order-log',
  '@milemate/visit-orders',
] as const;

export type OrderStorageKeySnapshot = {
  earliestTimestampMs: number | null;
  hasNoteCount: number;
  isArray: boolean;
  key: string;
  latestTimestampMs: number | null;
  parseError: string | null;
  present: boolean;
  rawRecordCount: number;
  topLevelShape: string;
  validCurrentSchemaCount: number;
  visitIds: string[];
  storeIds: string[];
};

export type OrderStorageDiagnosticReport = {
  allMileMateKeys: string[];
  currentStorageKey: string;
  earliestOrderTimestampMs: number | null;
  exportSafeBackupKeys: string[];
  hydrationStatus:
    | 'current_key_missing'
    | 'current_key_empty'
    | 'current_key_has_records'
    | 'current_key_parse_error';
  latestOrderTimestampMs: number | null;
  legacyKeysDetected: string[];
  legacyKeysWithData: string[];
  matchedStoreIdCount: number;
  perKey: Record<string, OrderStorageKeySnapshot>;
  scannedAt: string;
  totalRawOrderLikeRecords: number;
  totalValidCurrentSchemaRecords: number;
  unmatchedStoreIdCount: number;
  unmatchedStoreIds: string[];
};

function isOrderRelatedKey(key: string): boolean {
  const lower = key.toLowerCase();

  return (
    lower.includes('@milemate') &&
    (lower.includes('order') || lower.includes('delivery'))
  );
}

function snapshotFromParsed(key: string, parsed: unknown): OrderStorageKeySnapshot {
  const visitIds = new Set<string>();
  const storeIds = new Set<string>();
  let validCurrentSchemaCount = 0;
  let hasNoteCount = 0;
  let earliestTimestampMs: number | null = null;
  let latestTimestampMs: number | null = null;

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) {
        continue;
      }

      const record = entry as Record<string, unknown>;

      if (typeof record.storeId === 'string') {
        storeIds.add(record.storeId);
      }

      if (typeof record.visitId === 'string') {
        visitIds.add(record.visitId);
      }

      if (isCurrentSchemaStoreOrder(entry)) {
        validCurrentSchemaCount += 1;
      }

      if (orderRecordHasNote(record)) {
        hasNoteCount += 1;
      }

      const timestampMs = inferOrderTimestampMs(record);

      if (timestampMs !== null) {
        earliestTimestampMs =
          earliestTimestampMs === null
            ? timestampMs
            : Math.min(earliestTimestampMs, timestampMs);
        latestTimestampMs =
          latestTimestampMs === null
            ? timestampMs
            : Math.max(latestTimestampMs, timestampMs);
      }
    }

    return {
      earliestTimestampMs,
      hasNoteCount,
      isArray: true,
      key,
      latestTimestampMs,
      parseError: null,
      present: true,
      rawRecordCount: parsed.length,
      topLevelShape: `array(len=${parsed.length})`,
      validCurrentSchemaCount,
      visitIds: [...visitIds],
      storeIds: [...storeIds],
    };
  }

  return {
    earliestTimestampMs: null,
    hasNoteCount: 0,
    isArray: false,
    key,
    latestTimestampMs: null,
    parseError: null,
    present: true,
    rawRecordCount: 0,
    topLevelShape: describeStoreOrderRecordShape(parsed),
    validCurrentSchemaCount: 0,
    visitIds: [],
    storeIds: [],
  };
}

async function snapshotStorageKey(key: string): Promise<OrderStorageKeySnapshot> {
  const stored = await AsyncStorage.getItem(key);

  if (stored === null) {
    return {
      earliestTimestampMs: null,
      hasNoteCount: 0,
      isArray: false,
      key,
      latestTimestampMs: null,
      parseError: null,
      present: false,
      rawRecordCount: 0,
      topLevelShape: 'missing',
      validCurrentSchemaCount: 0,
      visitIds: [],
      storeIds: [],
    };
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    return snapshotFromParsed(key, parsed);
  } catch (error) {
    return {
      earliestTimestampMs: null,
      hasNoteCount: 0,
      isArray: false,
      key,
      latestTimestampMs: null,
      parseError: error instanceof Error ? error.message : 'JSON parse failed',
      present: true,
      rawRecordCount: 0,
      topLevelShape: 'unparseable',
      validCurrentSchemaCount: 0,
      visitIds: [],
      storeIds: [],
    };
  }
}

export async function collectOrderStorageDiagnosticReport(): Promise<OrderStorageDiagnosticReport> {
  const allKeys = await AsyncStorage.getAllKeys();
  const allMileMateKeys = [...allKeys]
    .filter((key) => key.includes('@milemate'))
    .sort();

  const legacyKeysDetected = [
    ...new Set([
      ...ORDER_STORAGE_LEGACY_KEY_CANDIDATES.filter((key) => allKeys.includes(key)),
      ...allKeys.filter(isOrderRelatedKey),
    ]),
  ].sort();

  const keysToScan = [
    ...new Set([
      ...ORDER_STORAGE_RELATED_KEYS,
      ...ORDER_STORAGE_LEGACY_KEY_CANDIDATES,
      ...legacyKeysDetected,
    ]),
  ].sort();

  const perKey: Record<string, OrderStorageKeySnapshot> = {};

  for (const key of keysToScan) {
    perKey[key] = await snapshotStorageKey(key);
  }

  const currentSnapshot = perKey[ORDER_STORAGE_CURRENT_KEY];
  const stores = await getStores();
  const knownStoreIds = new Set(stores.map((store) => store.id));

  const unmatchedStoreIds = new Set<string>();
  let totalRawOrderLikeRecords = 0;
  let totalValidCurrentSchemaRecords = 0;
  let earliestOrderTimestampMs: number | null = null;
  let latestOrderTimestampMs: number | null = null;

  for (const snapshot of Object.values(perKey)) {
    if (!snapshot.present || snapshot.parseError) {
      continue;
    }

    if (snapshot.key === ORDER_STORAGE_CURRENT_KEY || snapshot.key.includes('order')) {
      totalRawOrderLikeRecords += snapshot.rawRecordCount;
      totalValidCurrentSchemaRecords += snapshot.validCurrentSchemaCount;
    }

    for (const storeId of snapshot.storeIds) {
      if (!knownStoreIds.has(storeId)) {
        unmatchedStoreIds.add(storeId);
      }
    }

    if (snapshot.earliestTimestampMs !== null) {
      earliestOrderTimestampMs =
        earliestOrderTimestampMs === null
          ? snapshot.earliestTimestampMs
          : Math.min(earliestOrderTimestampMs, snapshot.earliestTimestampMs);
    }

    if (snapshot.latestTimestampMs !== null) {
      latestOrderTimestampMs =
        latestOrderTimestampMs === null
          ? snapshot.latestTimestampMs
          : Math.max(latestOrderTimestampMs, snapshot.latestTimestampMs);
    }
  }

  let hydrationStatus: OrderStorageDiagnosticReport['hydrationStatus'] =
    'current_key_missing';

  if (currentSnapshot?.present) {
    if (currentSnapshot.parseError) {
      hydrationStatus = 'current_key_parse_error';
    } else if (currentSnapshot.rawRecordCount === 0) {
      hydrationStatus = 'current_key_empty';
    } else {
      hydrationStatus = 'current_key_has_records';
    }
  }

  const legacyKeysWithData = legacyKeysDetected.filter((key) => {
    const snapshot = perKey[key];

    return snapshot?.present === true && snapshot.rawRecordCount > 0;
  });

  const matchedStoreIdCount = Object.values(perKey).reduce((count, snapshot) => {
    for (const storeId of snapshot.storeIds) {
      if (knownStoreIds.has(storeId)) {
        count += 1;
      }
    }

    return count;
  }, 0);

  return {
    allMileMateKeys,
    currentStorageKey: ORDER_STORAGE_CURRENT_KEY,
    earliestOrderTimestampMs,
    exportSafeBackupKeys: keysToScan.filter((key) => perKey[key]?.present === true),
    hydrationStatus,
    latestOrderTimestampMs,
    legacyKeysDetected,
    legacyKeysWithData,
    matchedStoreIdCount,
    perKey,
    scannedAt: new Date().toISOString(),
    totalRawOrderLikeRecords,
    totalValidCurrentSchemaRecords,
    unmatchedStoreIdCount: unmatchedStoreIds.size,
    unmatchedStoreIds: [...unmatchedStoreIds].sort(),
  };
}

export type OrderStorageBackupPayload = {
  exportedAt: string;
  keys: Record<
    string,
    {
      parseError: string | null;
      rawJson: string | null;
    }
  >;
  report: OrderStorageDiagnosticReport;
};

/** Read-only backup — does not modify AsyncStorage. */
export async function buildOrderStorageBackupPayload(): Promise<OrderStorageBackupPayload> {
  const report = await collectOrderStorageDiagnosticReport();
  const keys: OrderStorageBackupPayload['keys'] = {};

  for (const key of report.exportSafeBackupKeys) {
    const rawJson = await AsyncStorage.getItem(key);

    keys[key] = {
      parseError: report.perKey[key]?.parseError ?? null,
      rawJson,
    };
  }

  return {
    exportedAt: new Date().toISOString(),
    keys,
    report,
  };
}
