import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAllStoreOrders, STORE_ORDERS_STORAGE_KEY } from '@/services/store-orders';
import { getStores } from '@/services/stores';
import type { StoreOrder } from '@/types/store-order';
import {
  buildDuplicateStoreClusters,
  buildStoreIdRemapFromClusters,
  resolveRemappedStoreId,
} from '@/utils/store-duplicate-clusters';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';

export const STORE_ORDER_RECOVERY_BACKUP_KEY = '@milemate/store-orders-recovery-backup-v1';
export const STORE_ORDER_STORE_ID_REMAP_MARKER_KEY =
  '@milemate/store-order-store-id-remap-v1';

export type StoreOrderStoreIdRecoveryPreview = {
  backupKey: string;
  clusters: Array<{
    canonicalStoreId: string;
    memberStoreIds: string[];
  }>;
  ordersRemapped: number;
  remapEntries: Array<{ fromStoreId: string; toStoreId: string }>;
  unmatchedStoreIdsAfterRemap: string[];
};

export type StoreOrderStoreIdRecoveryResult = StoreOrderStoreIdRecoveryPreview & {
  applied: boolean;
  backupCreated: boolean;
};

async function ensureRecoveryBackup(rawJson: string | null): Promise<boolean> {
  const existing = await AsyncStorage.getItem(STORE_ORDER_RECOVERY_BACKUP_KEY);

  if (existing !== null) {
    return false;
  }

  if (rawJson === null) {
    await AsyncStorage.setItem(
      STORE_ORDER_RECOVERY_BACKUP_KEY,
      JSON.stringify({ exportedAt: new Date().toISOString(), rawJson: null }),
    );

    return true;
  }

  await AsyncStorage.setItem(
    STORE_ORDER_RECOVERY_BACKUP_KEY,
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      rawJson,
    }),
  );

  return true;
}

function countOrdersByStoreId(orders: StoreOrder[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const order of orders) {
    counts.set(order.storeId, (counts.get(order.storeId) ?? 0) + 1);
  }

  return counts;
}

export async function previewStoreOrderStoreIdRecovery(): Promise<StoreOrderStoreIdRecoveryPreview> {
  const [stores, orders, importRemap] = await Promise.all([
    getStores(),
    getAllStoreOrders(),
    getStoreImportIdRemap(),
  ]);
  const orderCountByStoreId = countOrdersByStoreId(orders);
  const clusters = buildDuplicateStoreClusters(stores, orderCountByStoreId);
  const clusterRemap = buildStoreIdRemapFromClusters(clusters);
  const remap = new Map<string, string>([...importRemap, ...clusterRemap]);
  const knownStoreIds = new Set(stores.map((store) => store.id));

  let ordersRemapped = 0;
  const unmatchedAfter = new Set<string>();

  for (const order of orders) {
    const nextStoreId = resolveRemappedStoreId(order.storeId, remap);

    if (nextStoreId !== order.storeId) {
      ordersRemapped += 1;
    }

    if (!knownStoreIds.has(nextStoreId)) {
      unmatchedAfter.add(nextStoreId);
    }
  }

  return {
    backupKey: STORE_ORDER_RECOVERY_BACKUP_KEY,
    clusters: clusters.map((cluster) => ({
      canonicalStoreId: cluster.canonicalStoreId,
      memberStoreIds: cluster.memberStoreIds,
    })),
    ordersRemapped,
    remapEntries: [...remap.entries()].map(([fromStoreId, toStoreId]) => ({
      fromStoreId,
      toStoreId,
    })),
    unmatchedStoreIdsAfterRemap: [...unmatchedAfter].sort(),
  };
}

export async function applyStoreOrderStoreIdRecovery(): Promise<StoreOrderStoreIdRecoveryResult> {
  const preview = await previewStoreOrderStoreIdRecovery();
  const rawJson = await AsyncStorage.getItem(STORE_ORDERS_STORAGE_KEY);
  const backupCreated = await ensureRecoveryBackup(rawJson);

  if (preview.ordersRemapped === 0) {
    await AsyncStorage.setItem(
      STORE_ORDER_STORE_ID_REMAP_MARKER_KEY,
      new Date().toISOString(),
    );

    return {
      ...preview,
      applied: false,
      backupCreated,
    };
  }

  const orders = await getAllStoreOrders();
  const remap = new Map(
    preview.remapEntries.map((entry) => [entry.fromStoreId, entry.toStoreId]),
  );
  const now = new Date().toISOString();

  const nextOrders = orders.map((order) => {
    const nextStoreId = resolveRemappedStoreId(order.storeId, remap);

    if (nextStoreId === order.storeId) {
      return order;
    }

    return {
      ...order,
      storeId: nextStoreId,
      updatedAt: now,
    };
  });

  await AsyncStorage.setItem(STORE_ORDERS_STORAGE_KEY, JSON.stringify(nextOrders));
  await AsyncStorage.setItem(
    STORE_ORDER_STORE_ID_REMAP_MARKER_KEY,
    new Date().toISOString(),
  );

  return {
    ...preview,
    applied: true,
    backupCreated,
  };
}

/** Idempotent: remaps orders onto canonical store IDs after duplicate imports. */
export async function ensureStoreOrderStoreIdRecovery(): Promise<StoreOrderStoreIdRecoveryResult> {
  return applyStoreOrderStoreIdRecovery();
}
