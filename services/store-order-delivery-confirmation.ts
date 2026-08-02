import {
  createStoreOrder,
  markStoreOrderDelivered,
  markStoreOrderMissed,
  revertStoreOrderToUnconfirmed,
} from '@/services/store-orders';
import { deleteDeliveryCheckById } from '@/services/store-order-delivery-checks';
import type { StoreOrder } from '@/types/store-order';

const inFlightOrderIds = new Set<string>();

export type StoreOrderConfirmationUndoSnapshot = {
  order: StoreOrder;
  removedDeliveryCheckId: string | null;
};

export async function confirmStoreOrderDeliveredWithUndo(
  previousOrder: StoreOrder,
): Promise<{ order: StoreOrder | null; snapshot: StoreOrderConfirmationUndoSnapshot | null }> {
  if (inFlightOrderIds.has(previousOrder.id)) {
    return { order: null, snapshot: null };
  }

  inFlightOrderIds.add(previousOrder.id);

  try {
    const order = await markStoreOrderDelivered(previousOrder.id);

    if (!order) {
      return { order: null, snapshot: null };
    }

    return {
      order,
      snapshot: {
        order: previousOrder,
        removedDeliveryCheckId: null,
      },
    };
  } finally {
    inFlightOrderIds.delete(previousOrder.id);
  }
}

export async function confirmStoreOrderMissedWithUndo(
  previousOrder: StoreOrder,
): Promise<{ order: StoreOrder | null; snapshot: StoreOrderConfirmationUndoSnapshot | null }> {
  if (inFlightOrderIds.has(previousOrder.id)) {
    return { order: null, snapshot: null };
  }

  inFlightOrderIds.add(previousOrder.id);

  try {
    const order = await markStoreOrderMissed(previousOrder.id);

    if (!order) {
      return { order: null, snapshot: null };
    }

    return {
      order,
      snapshot: {
        order: previousOrder,
        removedDeliveryCheckId: null,
      },
    };
  } finally {
    inFlightOrderIds.delete(previousOrder.id);
  }
}

export async function undoStoreOrderConfirmation(
  snapshot: StoreOrderConfirmationUndoSnapshot,
): Promise<StoreOrder | null> {
  const restored = await revertStoreOrderToUnconfirmed(snapshot.order);

  if (restored && snapshot.removedDeliveryCheckId) {
    await deleteDeliveryCheckById(snapshot.removedDeliveryCheckId);
  }

  return restored;
}

export async function createScheduledStoreDelivery(input: {
  expectedDeliveryDate: string;
  placedAt: string;
  storeId: string;
}): Promise<StoreOrder> {
  return createStoreOrder({
    expectedDeliveryDate: input.expectedDeliveryDate,
    placedAt: input.placedAt,
    storeId: input.storeId,
  });
}

export async function createPastDeliveryWithOutcome(input: {
  expectedDeliveryDate: string;
  outcome: 'delivered' | 'missed' | 'unconfirmed';
  placedAt: string;
  storeId: string;
}): Promise<StoreOrder | null> {
  const order = await createScheduledStoreDelivery({
    expectedDeliveryDate: input.expectedDeliveryDate,
    placedAt: input.placedAt,
    storeId: input.storeId,
  });

  if (input.outcome === 'unconfirmed') {
    return order;
  }

  if (input.outcome === 'delivered') {
    return markStoreOrderDelivered(order.id);
  }

  return markStoreOrderMissed(order.id);
}

export function __resetStoreOrderConfirmationInFlightForTests(): void {
  inFlightOrderIds.clear();
}
