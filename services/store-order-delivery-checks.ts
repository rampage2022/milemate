import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getAllStoreOrders,
  getPendingOrdersExpectedOnDate as getPendingOrdersExpectedOnDateFromOrders,
  getStoresWithDeliveriesExpectedOnDate as getStoresWithDeliveriesExpectedOnDateFromOrders,
} from '@/services/store-orders';
import type { StoreOrder } from '@/types/store-order';
import type {
  CreateStoreOrderDeliveryCheckInput,
  StoreOrderDeliveryCheck,
  UnresolvedStoreDelivery,
} from '@/types/store-order-delivery-check';
import { sortPendingStoreOrders } from '@/utils/store-order-presentation';

const STORE_ORDER_DELIVERY_CHECKS_STORAGE_KEY = '@milemate/store-order-delivery-checks';
const DUPLICATE_CHECK_GUARD_MS = 3000;

let testChecksOverride: StoreOrderDeliveryCheck[] | null | undefined;

function isStoreOrderDeliveryCheck(value: unknown): value is StoreOrderDeliveryCheck {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.orderId === 'string' &&
    typeof record.storeId === 'string' &&
    record.outcome === 'not_received' &&
    typeof record.checkedAt === 'string' &&
    (record.visitId === undefined || typeof record.visitId === 'string') &&
    typeof record.createdAt === 'string'
  );
}

async function readDeliveryChecks(): Promise<StoreOrderDeliveryCheck[]> {
  if (testChecksOverride !== undefined) {
    return testChecksOverride ?? [];
  }

  const stored = await AsyncStorage.getItem(STORE_ORDER_DELIVERY_CHECKS_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isStoreOrderDeliveryCheck);
  } catch {
    return [];
  }
}

async function writeDeliveryChecks(checks: StoreOrderDeliveryCheck[]): Promise<void> {
  if (testChecksOverride !== undefined) {
    testChecksOverride = checks;
    return;
  }

  await AsyncStorage.setItem(
    STORE_ORDER_DELIVERY_CHECKS_STORAGE_KEY,
    JSON.stringify(checks),
  );
}

function buildDeliveryCheckId(orderId: string, createdAtMs: number): string {
  return `delivery-check-${orderId}-${createdAtMs}`;
}

function sortChecksNewestFirst(
  checks: StoreOrderDeliveryCheck[],
): StoreOrderDeliveryCheck[] {
  return [...checks].sort((left, right) => right.checkedAt.localeCompare(left.checkedAt));
}

export async function deleteDeliveryCheckById(checkId: string): Promise<void> {
  const checks = await readDeliveryChecks();
  await writeDeliveryChecks(checks.filter((check) => check.id !== checkId));
}

export async function createStoreOrderDeliveryCheck(
  input: CreateStoreOrderDeliveryCheckInput,
): Promise<StoreOrderDeliveryCheck> {
  const nowIso = new Date().toISOString();
  const existingChecks = await readDeliveryChecks();
  const latestForOrder = sortChecksNewestFirst(
    existingChecks.filter(
      (check) => check.orderId === input.orderId && check.outcome === 'not_received',
    ),
  )[0];

  if (
    latestForOrder &&
    Date.now() - new Date(latestForOrder.checkedAt).getTime() < DUPLICATE_CHECK_GUARD_MS
  ) {
    return latestForOrder;
  }

  const check: StoreOrderDeliveryCheck = {
    id: buildDeliveryCheckId(input.orderId, Date.now()),
    orderId: input.orderId,
    storeId: input.storeId,
    outcome: input.outcome,
    checkedAt: nowIso,
    visitId: input.visitId,
    createdAt: nowIso,
  };

  await writeDeliveryChecks([...existingChecks, check]);

  return check;
}

export async function getAllStoreOrderDeliveryChecks(): Promise<StoreOrderDeliveryCheck[]> {
  return readDeliveryChecks();
}

export async function getDeliveryChecksForOrder(
  orderId: string,
): Promise<StoreOrderDeliveryCheck[]> {
  const checks = await readDeliveryChecks();

  return sortChecksNewestFirst(checks.filter((check) => check.orderId === orderId));
}

export async function getLatestDeliveryCheckForOrder(
  orderId: string,
): Promise<StoreOrderDeliveryCheck | null> {
  const checks = await getDeliveryChecksForOrder(orderId);

  return checks[0] ?? null;
}

export async function getLatestNotReceivedCheckForOrder(
  orderId: string,
): Promise<StoreOrderDeliveryCheck | null> {
  const checks = await getDeliveryChecksForOrder(orderId);

  return checks.find((check) => check.outcome === 'not_received') ?? null;
}

export async function getLatestNotReceivedCheckForStore(
  storeId: string,
): Promise<StoreOrderDeliveryCheck | null> {
  const orders = await getAllStoreOrders();
  const pendingOrderIds = new Set(
    orders.filter((order) => order.storeId === storeId && order.status === 'pending').map(
      (order) => order.id,
    ),
  );
  const checks = await readDeliveryChecks();

  return (
    sortChecksNewestFirst(
      checks.filter(
        (check) =>
          check.storeId === storeId &&
          check.outcome === 'not_received' &&
          pendingOrderIds.has(check.orderId),
      ),
    )[0] ?? null
  );
}

async function getUnresolvedStoreDeliveries(): Promise<UnresolvedStoreDelivery[]> {
  const orders = await getAllStoreOrders();
  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const checks = await readDeliveryChecks();
  const unresolved: UnresolvedStoreDelivery[] = [];

  for (const order of pendingOrders) {
    const latestNotReceived = sortChecksNewestFirst(
      checks.filter(
        (check) => check.orderId === order.id && check.outcome === 'not_received',
      ),
    )[0];

    if (!latestNotReceived) {
      continue;
    }

    unresolved.push({
      order,
      storeId: order.storeId,
      latestNotReceivedCheck: latestNotReceived,
    });
  }

  return unresolved;
}

export async function getUnresolvedNotReceivedOrders(): Promise<StoreOrder[]> {
  const unresolved = await getUnresolvedStoreDeliveries();

  return sortPendingStoreOrders(unresolved.map((entry) => entry.order));
}

export async function getStoresWithUnresolvedNotReceivedDeliveries(): Promise<string[]> {
  const unresolved = await getUnresolvedStoreDeliveries();

  return [...new Set(unresolved.map((entry) => entry.storeId))];
}

export async function getPendingOrdersExpectedOnDate(
  referenceDate: Date,
): Promise<StoreOrder[]> {
  return getPendingOrdersExpectedOnDateFromOrders(referenceDate);
}

export async function getStoresWithDeliveriesExpectedOnDate(
  referenceDate: Date,
): Promise<string[]> {
  return getStoresWithDeliveriesExpectedOnDateFromOrders(referenceDate);
}

export function __setStoreOrderDeliveryChecksStorageForTests(
  checks: StoreOrderDeliveryCheck[] | null,
): void {
  testChecksOverride = checks;
}

export function __resetStoreOrderDeliveryChecksStorageForTests(): void {
  testChecksOverride = undefined;
}

export { STORE_ORDER_DELIVERY_CHECKS_STORAGE_KEY };
