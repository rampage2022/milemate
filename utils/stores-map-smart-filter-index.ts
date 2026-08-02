import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import { resolveRouteDeliveryChipModel } from '@/utils/route-store-delivery-signal';
import { startOfLocalDay } from '@/utils/store-order-delivery-presentation';

export type StoresMapSmartFilterId =
  | 'delivery_soon'
  | 'missed_delivery'
  | 'no_visit_7d'
  | 'no_delivery_7d';

export const STORES_MAP_SMART_FILTER_IDS: StoresMapSmartFilterId[] = [
  'delivery_soon',
  'missed_delivery',
  'no_visit_7d',
  'no_delivery_7d',
];

export type StoresMapSmartFilterIndex = {
  /** Pending delivery today or on a future local day (route chip today | scheduled). */
  deliverySoonStoreIds: ReadonlySet<string>;
  missedDeliveryStoreIds: ReadonlySet<string>;
  noDelivery7PlusStoreIds: ReadonlySet<string>;
  noVisit7PlusStoreIds: ReadonlySet<string>;
};

const NO_ACTIVITY_THRESHOLD_DAYS = 7;

export function localDayDifferenceFromToday(timestampMs: number, referenceDate: Date): number {
  const startOfToday = startOfLocalDay(referenceDate);
  const completedDay = startOfLocalDay(new Date(timestampMs));

  return Math.round((startOfToday.getTime() - completedDay.getTime()) / 86_400_000);
}

export function storeQualifiesForNoVisit7Plus(input: {
  lastCompletedAtMs: number | null;
  referenceDate: Date;
}): boolean {
  if (input.lastCompletedAtMs === null) {
    return true;
  }

  return localDayDifferenceFromToday(input.lastCompletedAtMs, input.referenceDate) >= NO_ACTIVITY_THRESHOLD_DAYS;
}

export function storeQualifiesForNoDelivery7Plus(input: {
  lastDeliveredAtMs: number | null;
  referenceDate: Date;
}): boolean {
  if (input.lastDeliveredAtMs === null) {
    return true;
  }

  return localDayDifferenceFromToday(input.lastDeliveredAtMs, input.referenceDate) >= NO_ACTIVITY_THRESHOLD_DAYS;
}

function maxCompletedVisitMsByStore(visits: StoreVisit[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const visit of visits) {
    if (visit.status !== 'completed' || typeof visit.completedAt !== 'number') {
      continue;
    }

    const existing = map.get(visit.storeId);

    if (existing === undefined || visit.completedAt > existing) {
      map.set(visit.storeId, visit.completedAt);
    }
  }

  return map;
}

function maxDeliveredAtMsByStore(orders: StoreOrder[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const order of orders) {
    if (order.status !== 'delivered' || !order.deliveredAt) {
      continue;
    }

    const deliveredMs = Date.parse(order.deliveredAt);

    if (!Number.isFinite(deliveredMs)) {
      continue;
    }

    const existing = map.get(order.storeId);

    if (existing === undefined || deliveredMs > existing) {
      map.set(order.storeId, deliveredMs);
    }
  }

  return map;
}

function groupOrdersByStore(orders: StoreOrder[]): Map<string, StoreOrder[]> {
  const map = new Map<string, StoreOrder[]>();

  for (const order of orders) {
    const list = map.get(order.storeId);

    if (list) {
      list.push(order);
    } else {
      map.set(order.storeId, [order]);
    }
  }

  return map;
}

export function buildLatestNotReceivedChecksByOrderId(
  checks: StoreOrderDeliveryCheck[],
): Record<string, StoreOrderDeliveryCheck | null> {
  const map: Record<string, StoreOrderDeliveryCheck | null> = {};

  for (const check of checks) {
    if (check.outcome !== 'not_received') {
      continue;
    }

    const existing = map[check.orderId];

    if (!existing || check.checkedAt.localeCompare(existing.checkedAt) > 0) {
      map[check.orderId] = check;
    }
  }

  return map;
}

export function buildStoresMapSmartFilterIndex(input: {
  checksByOrderId?: Record<string, StoreOrderDeliveryCheck | null | undefined>;
  orders: StoreOrder[];
  referenceDate?: Date;
  storeIds: readonly string[];
  visits: StoreVisit[];
}): StoresMapSmartFilterIndex {
  const referenceDate = input.referenceDate ?? new Date();
  const ordersByStore = groupOrdersByStore(input.orders);
  const lastVisitMs = maxCompletedVisitMsByStore(input.visits);
  const lastDeliveryMs = maxDeliveredAtMsByStore(input.orders);

  const deliverySoonStoreIds = new Set<string>();
  const missedDeliveryStoreIds = new Set<string>();
  const noVisit7PlusStoreIds = new Set<string>();
  const noDelivery7PlusStoreIds = new Set<string>();

  for (const storeId of input.storeIds) {
    const storeOrders = ordersByStore.get(storeId) ?? [];
    const chip = resolveRouteDeliveryChipModel({
      checksByOrderId: input.checksByOrderId ?? {},
      orders: storeOrders,
      referenceDate,
    });

    if (chip?.status === 'today' || chip?.status === 'scheduled') {
      deliverySoonStoreIds.add(storeId);
    }

    if (chip?.status === 'missed') {
      missedDeliveryStoreIds.add(storeId);
    }

    if (
      storeQualifiesForNoVisit7Plus({
        lastCompletedAtMs: lastVisitMs.get(storeId) ?? null,
        referenceDate,
      })
    ) {
      noVisit7PlusStoreIds.add(storeId);
    }

    if (
      storeQualifiesForNoDelivery7Plus({
        lastDeliveredAtMs: lastDeliveryMs.get(storeId) ?? null,
        referenceDate,
      })
    ) {
      noDelivery7PlusStoreIds.add(storeId);
    }
  }

  return {
    deliverySoonStoreIds,
    missedDeliveryStoreIds,
    noDelivery7PlusStoreIds,
    noVisit7PlusStoreIds,
  };
}

export function storeMatchesSmartFilters(input: {
  enabledSmartFilters: readonly StoresMapSmartFilterId[];
  index: StoresMapSmartFilterIndex;
  storeId: string;
}): boolean {
  if (input.enabledSmartFilters.length === 0) {
    return true;
  }

  return input.enabledSmartFilters.every((filterId) => {
    switch (filterId) {
      case 'delivery_soon':
        return input.index.deliverySoonStoreIds.has(input.storeId);
      case 'missed_delivery':
        return input.index.missedDeliveryStoreIds.has(input.storeId);
      case 'no_visit_7d':
        return input.index.noVisit7PlusStoreIds.has(input.storeId);
      case 'no_delivery_7d':
        return input.index.noDelivery7PlusStoreIds.has(input.storeId);
      default:
        return true;
    }
  });
}

export function smartFilterLabel(filterId: StoresMapSmartFilterId): string {
  switch (filterId) {
    case 'delivery_soon':
      return 'Delivery Soon';
    case 'missed_delivery':
      return 'Missed Delivery';
    case 'no_visit_7d':
      return 'No Visit 7+ Days';
    case 'no_delivery_7d':
      return 'No Delivery 7+ Days';
    default:
      return filterId;
  }
}

export function smartFilterQuickLabel(filterId: StoresMapSmartFilterId): string {
  switch (filterId) {
    case 'delivery_soon':
      return 'Delivery Soon';
    case 'missed_delivery':
      return 'Missed';
    case 'no_visit_7d':
      return 'No Visit 7+';
    case 'no_delivery_7d':
      return 'No Delivery 7+';
    default:
      return smartFilterLabel(filterId);
  }
}
