import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import {
  diffLocalCalendarDays,
  isStoreOrderDateAfter,
  isStoreOrderDateBeforePastWindow,
  isStoreOrderDateWithinPastCalendarDaysInclusive,
  startOfLocalCalendarDay,
} from '@/utils/local-calendar-date';
import { parseStoreOrderDateString } from '@/utils/store-order-presentation';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';
import { calendarDaysSelectedBeforeReference } from '@/utils/store-delivery-new-entry';

export const STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS = 14;

export type StoreDeliveryQueueItem = {
  order: StoreOrder;
  orderId: string;
};

export function isStoreOrderConfirmedMissed(input: {
  latestNotReceivedCheck: StoreOrderDeliveryCheck | null;
  order: StoreOrder;
}): boolean {
  if (input.order.status === 'missed') {
    return true;
  }

  return (
    input.order.status === 'pending' && input.latestNotReceivedCheck !== null
  );
}

export function isStoreOrderUnconfirmed(input: {
  latestNotReceivedCheck: StoreOrderDeliveryCheck | null;
  order: StoreOrder;
}): boolean {
  if (input.order.status === 'delivered' || input.order.status === 'missed') {
    return false;
  }

  if (isStoreOrderConfirmedMissed(input)) {
    return false;
  }

  return input.order.status === 'pending';
}

export function sortOrdersByExpectedDateNewestFirst(orders: StoreOrder[]): StoreOrder[] {
  return [...orders].sort((left, right) => {
    const leftTime =
      parseStoreOrderDateString(left.expectedDeliveryDate)?.getTime() ?? 0;
    const rightTime =
      parseStoreOrderDateString(right.expectedDeliveryDate)?.getTime() ?? 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function sortOrdersByExpectedDateSoonestFirst(orders: StoreOrder[]): StoreOrder[] {
  return [...orders].sort((left, right) => {
    const leftTime =
      parseStoreOrderDateString(left.expectedDeliveryDate)?.getTime() ?? 0;
    const rightTime =
      parseStoreOrderDateString(right.expectedDeliveryDate)?.getTime() ?? 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

/**
 * Keeps one row per stable delivery record ID.
 * Duplicate array entries with the same `order.id` keep the newest `updatedAt`.
 * Never merges distinct IDs, even when store/date/status match.
 */
export function dedupeOrdersByStableRecordId(orders: StoreOrder[]): StoreOrder[] {
  const byId = new Map<string, StoreOrder>();

  for (const order of orders) {
    const existing = byId.get(order.id);

    if (!existing || existing.updatedAt.localeCompare(order.updatedAt) <= 0) {
      byId.set(order.id, order);
    }
  }

  return [...byId.values()];
}

export function filterOrdersForCanonicalStore(input: {
  canonicalStoreId: string;
  orders: StoreOrder[];
  storeIdRemap: ReadonlyMap<string, string>;
}): StoreOrder[] {
  const matching = input.orders.filter(
    (order) =>
      resolveRemappedStoreId(order.storeId, input.storeIdRemap) ===
      input.canonicalStoreId,
  );

  return dedupeOrdersByStableRecordId(matching);
}

export function buildStoreDeliveriesNeedsConfirmationQueue(input: {
  checksByOrderId: Record<string, StoreOrderDeliveryCheck | null | undefined>;
  orders: StoreOrder[];
  reference?: Date;
}): StoreDeliveryQueueItem[] {
  const reference = input.reference ?? new Date();

  const unconfirmed = input.orders.filter((order) =>
    isStoreOrderUnconfirmed({
      order,
      latestNotReceivedCheck: input.checksByOrderId[order.id] ?? null,
    }),
  );

  const inWindow = unconfirmed.filter((order) => {
    if (isStoreOrderDateAfter(order.expectedDeliveryDate, reference)) {
      return false;
    }

    return isStoreOrderDateWithinPastCalendarDaysInclusive({
      expectedDeliveryDate: order.expectedDeliveryDate,
      pastDays: STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS,
      reference,
    });
  });

  return sortOrdersByExpectedDateNewestFirst(inWindow).map((order) => ({
    order,
    orderId: order.id,
  }));
}

export function buildStoreDeliveriesUpcomingQueue(input: {
  checksByOrderId: Record<string, StoreOrderDeliveryCheck | null | undefined>;
  orders: StoreOrder[];
  reference?: Date;
}): StoreDeliveryQueueItem[] {
  const reference = input.reference ?? new Date();

  const upcoming = input.orders.filter((order) => {
    if (!isStoreOrderUnconfirmed({
      order,
      latestNotReceivedCheck: input.checksByOrderId[order.id] ?? null,
    })) {
      return false;
    }

    return isStoreOrderDateAfter(order.expectedDeliveryDate, reference);
  });

  return sortOrdersByExpectedDateSoonestFirst(upcoming).map((order) => ({
    order,
    orderId: order.id,
  }));
}

export function isNewEntryDateAllowedForQuickFlow(input: {
  expectedDeliveryDate: string;
  reference?: Date;
}): boolean {
  return !isStoreOrderDateBeforePastWindow({
    expectedDeliveryDate: input.expectedDeliveryDate,
    pastDays: STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS,
    reference: input.reference,
  });
}

export function isSelectedLocalDateInPast(input: {
  reference?: Date;
  selectedDate: Date;
}): boolean {
  const reference = startOfLocalCalendarDay(input.reference ?? new Date());
  const selected = startOfLocalCalendarDay(input.selectedDate);

  return calendarDaysSelectedBeforeReference(selected, reference) > 0;
}

export function isSelectedLocalDateTodayOrFuture(input: {
  reference?: Date;
  selectedDate: Date;
}): boolean {
  const reference = startOfLocalCalendarDay(input.reference ?? new Date());
  const selected = startOfLocalCalendarDay(input.selectedDate);

  return calendarDaysSelectedBeforeReference(selected, reference) <= 0;
}
