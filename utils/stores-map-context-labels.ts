import type { StoreGroup } from '@/types/store-group';
import type { StoreOrder } from '@/types/store-order';
import type { StoreVisit } from '@/types/store-visit';
import { resolveRouteDeliveryChipModel } from '@/utils/route-store-delivery-signal';
import {
  localDayDifferenceFromToday,
  smartFilterLabel,
  type StoresMapSmartFilterId,
  type StoresMapSmartFilterIndex,
} from '@/utils/stores-map-smart-filter-index';

export type StoresMapContextLabel = {
  kind: 'group' | 'smart' | 'workday';
  text: string;
};

export function pickStoresMapContextLabels(input: {
  activeGroupNames: string[];
  enabledSmartFilters: readonly StoresMapSmartFilterId[];
  index: StoresMapSmartFilterIndex;
  maxLabels?: number;
  storeId: string;
}): StoresMapContextLabel[] {
  const max = input.maxLabels ?? 2;
  const labels: StoresMapContextLabel[] = [];

  if (input.index.missedDeliveryStoreIds.has(input.storeId)) {
    labels.push({ kind: 'smart', text: 'Missed delivery' });
  } else if (input.index.deliverySoonStoreIds.has(input.storeId)) {
    labels.push({ kind: 'smart', text: 'Delivery soon' });
  }

  if (input.enabledSmartFilters.includes('no_visit_7d')) {
    labels.push({ kind: 'smart', text: 'No visit 7+ days' });
  }

  if (input.activeGroupNames.length > 0) {
    labels.push({
      kind: 'group',
      text: input.activeGroupNames[0]!,
    });
  }

  for (const filterId of input.enabledSmartFilters) {
    if (labels.length >= max) {
      break;
    }

    const text =
      filterId === 'missed_delivery' || filterId === 'delivery_soon'
        ? null
        : smartFilterLabel(filterId);

    if (text && !labels.some((label) => label.text === text)) {
      labels.push({ kind: 'smart', text });
    }
  }

  return labels.slice(0, max);
}

export function buildDeliveryContextLabel(input: {
  orders: StoreOrder[];
  referenceDate?: Date;
  storeId: string;
}): string | null {
  const storeOrders = input.orders.filter((order) => order.storeId === input.storeId);
  const chip = resolveRouteDeliveryChipModel({
    checksByOrderId: {},
    orders: storeOrders,
    referenceDate: input.referenceDate,
  });

  if (!chip) {
    return null;
  }

  if (chip.status === 'missed') {
    return 'Missed delivery';
  }

  if (chip.status === 'today') {
    return 'Delivery today';
  }

  if (chip.status === 'scheduled' && chip.details.scheduledDate) {
    return `Delivery ${chip.details.scheduledDate}`;
  }

  return 'Delivery soon';
}

export function buildNoVisitContextLabel(input: {
  lastCompletedAtMs: number | null;
  referenceDate: Date;
}): string | null {
  if (input.lastCompletedAtMs === null) {
    return 'No completed visit';
  }

  const days = localDayDifferenceFromToday(input.lastCompletedAtMs, input.referenceDate);

  if (days >= 7) {
    return `No visit in ${days} days`;
  }

  return null;
}

export function resolveLastCompletedVisitMs(
  visits: StoreVisit[],
  storeId: string,
): number | null {
  let max: number | null = null;

  for (const visit of visits) {
    if (visit.storeId !== storeId || visit.status !== 'completed') {
      continue;
    }

    if (typeof visit.completedAt === 'number' && (max === null || visit.completedAt > max)) {
      max = visit.completedAt;
    }
  }

  return max;
}
