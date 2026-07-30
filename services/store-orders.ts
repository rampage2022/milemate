import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CreateStoreOrderInput, StoreOrder } from '@/types/store-order';
import {
  filterPendingStoreOrders,
  sortPendingStoreOrders,
  validateCreateStoreOrderInput,
} from '@/utils/store-order-presentation';
import { isStoreOrderExpectedOnDate } from '@/utils/store-order-delivery-presentation';

const STORE_ORDERS_STORAGE_KEY = '@milemate/store-orders';

let testOrdersOverride: StoreOrder[] | null | undefined;

function isStoreOrder(value: unknown): value is StoreOrder {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.storeId === 'string' &&
    typeof record.placedAt === 'string' &&
    typeof record.expectedDeliveryDate === 'string' &&
    (record.status === 'pending' || record.status === 'delivered') &&
    (record.deliveredAt === undefined || typeof record.deliveredAt === 'string') &&
    (record.note === undefined || typeof record.note === 'string') &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

async function readOrders(): Promise<StoreOrder[]> {
  if (testOrdersOverride !== undefined) {
    return testOrdersOverride ?? [];
  }

  const stored = await AsyncStorage.getItem(STORE_ORDERS_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isStoreOrder);
  } catch {
    return [];
  }
}

async function writeOrders(orders: StoreOrder[]): Promise<void> {
  if (testOrdersOverride !== undefined) {
    testOrdersOverride = orders;
    return;
  }

  await AsyncStorage.setItem(STORE_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function buildStoreOrderId(storeId: string, createdAtMs: number): string {
  return `order-${storeId}-${createdAtMs}`;
}

export async function createStoreOrder(input: CreateStoreOrderInput): Promise<StoreOrder> {
  const validationError = validateCreateStoreOrderInput(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const now = new Date().toISOString();
  const trimmedNote = input.note?.trim();

  const order: StoreOrder = {
    id: buildStoreOrderId(input.storeId, Date.now()),
    storeId: input.storeId,
    placedAt: input.placedAt,
    expectedDeliveryDate: input.expectedDeliveryDate,
    status: 'pending',
    note: trimmedNote ? trimmedNote : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const orders = await readOrders();
  await writeOrders([...orders, order]);

  return order;
}

export async function getOrdersForStore(storeId: string): Promise<StoreOrder[]> {
  const orders = await readOrders();

  return orders.filter((order) => order.storeId === storeId);
}

export async function getOrderHistoryForStore(storeId: string): Promise<StoreOrder[]> {
  const orders = await getOrdersForStore(storeId);

  return [...orders].sort((left, right) => {
    const placedCompare = right.placedAt.localeCompare(left.placedAt);

    if (placedCompare !== 0) {
      return placedCompare;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

export async function getPendingStoreOrders(storeId: string): Promise<StoreOrder[]> {
  const orders = await getOrdersForStore(storeId);
  return sortPendingStoreOrders(filterPendingStoreOrders(orders));
}

export async function markStoreOrderDelivered(orderId: string): Promise<StoreOrder | null> {
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.id === orderId);

  if (index < 0) {
    return null;
  }

  const existing = orders[index]!;

  if (existing.status === 'delivered') {
    return existing;
  }

  const updated: StoreOrder = {
    ...existing,
    status: 'delivered',
    deliveredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const nextOrders = [...orders];
  nextOrders[index] = updated;
  await writeOrders(nextOrders);

  return updated;
}

export async function getAllStoreOrders(): Promise<StoreOrder[]> {
  return readOrders();
}

export async function getPendingOrdersExpectedOnDate(
  referenceDate: Date,
): Promise<StoreOrder[]> {
  const orders = await readOrders();

  return sortPendingStoreOrders(
    filterPendingStoreOrders(orders).filter((order) =>
      isStoreOrderExpectedOnDate(order.expectedDeliveryDate, referenceDate),
    ),
  );
}

export async function getStoresWithDeliveriesExpectedOnDate(
  referenceDate: Date,
): Promise<string[]> {
  const orders = await getPendingOrdersExpectedOnDate(referenceDate);

  return [...new Set(orders.map((order) => order.storeId))];
}

export async function getMostRecentDeliveredOrderForStore(
  storeId: string,
): Promise<StoreOrder | null> {
  const orders = await getOrdersForStore(storeId);

  return (
    orders
      .filter((order) => order.status === 'delivered' && order.deliveredAt)
      .sort((left, right) => right.deliveredAt!.localeCompare(left.deliveredAt!))[0] ?? null
  );
}

export function __setStoreOrdersStorageForTests(orders: StoreOrder[] | null): void {
  testOrdersOverride = orders;
}

export function __resetStoreOrdersStorageForTests(): void {
  testOrdersOverride = undefined;
}

export { STORE_ORDERS_STORAGE_KEY };
