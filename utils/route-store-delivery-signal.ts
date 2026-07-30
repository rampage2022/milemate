import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import {
  formatStoreOrderDeliveryDate,
  sortPendingStoreOrders,
} from '@/utils/store-order-presentation';
import {
  formatDeliveryCheckTimeLabel,
  isStoreOrderExpectedOnDate,
  isStoreOrderOverdue,
  startOfLocalDay,
} from '@/utils/store-order-delivery-presentation';
import { parseStoreOrderDateString } from '@/utils/store-order-presentation';

export type RouteDeliveryChipStatus = 'today' | 'scheduled' | 'missed';

export type RouteDeliveryDetailFields = {
  deliveryDate?: string;
  missedDate?: string;
  notes?: string;
  reason?: string;
  scheduledDate?: string;
  statusLabel: string;
  updatedAt?: string;
};

export type RouteDeliveryChipModel = {
  details: RouteDeliveryDetailFields;
  hasInteractiveDetails: boolean;
  status: RouteDeliveryChipStatus;
  statusLabel: 'Delivery Today' | 'Delivery Scheduled' | 'Delivery Missed';
};

const STATUS_LABELS = {
  today: 'Delivery Today',
  scheduled: 'Delivery Scheduled',
  missed: 'Delivery Missed',
} as const;

function pickPrimaryPendingOrder(orders: StoreOrder[]): StoreOrder | null {
  const pending = sortPendingStoreOrders(
    orders.filter((order) => order.status === 'pending'),
  );

  return pending[0] ?? null;
}

function buildMissedReason(
  order: StoreOrder,
  check: StoreOrderDeliveryCheck | null,
  referenceDate: Date,
): string | undefined {
  if (check) {
    return 'Not received on last check';
  }

  if (isStoreOrderOverdue(order.expectedDeliveryDate, referenceDate)) {
    return 'Expected delivery was not available';
  }

  return undefined;
}

export function resolveRouteDeliveryChipModel(input: {
  checksByOrderId: Record<string, StoreOrderDeliveryCheck | null | undefined>;
  orders: StoreOrder[];
  referenceDate?: Date;
}): RouteDeliveryChipModel | null {
  const referenceDate = input.referenceDate ?? new Date();
  const pending = sortPendingStoreOrders(
    input.orders.filter((order) => order.status === 'pending'),
  );

  if (pending.length === 0) {
    return null;
  }

  let missedCandidate: {
    check: StoreOrderDeliveryCheck | null;
    order: StoreOrder;
  } | null = null;
  let todayCandidate: StoreOrder | null = null;
  let scheduledCandidate: StoreOrder | null = null;

  for (const order of pending) {
    const check = input.checksByOrderId[order.id] ?? null;
    const overdue = isStoreOrderOverdue(order.expectedDeliveryDate, referenceDate);
    const notReceived = check !== null;

    if (notReceived || overdue) {
      if (!missedCandidate) {
        missedCandidate = { order, check };
      }
      continue;
    }

    if (isStoreOrderExpectedOnDate(order.expectedDeliveryDate, referenceDate)) {
      todayCandidate ??= order;
      continue;
    }

    const expected = parseStoreOrderDateString(order.expectedDeliveryDate);

    if (
      expected &&
      startOfLocalDay(expected).getTime() > startOfLocalDay(referenceDate).getTime()
    ) {
      scheduledCandidate ??= order;
    }
  }

  if (missedCandidate) {
    const { check, order } = missedCandidate;
    const scheduledDate = formatStoreOrderDeliveryDate(order.expectedDeliveryDate);
    const reason = buildMissedReason(order, check, referenceDate);
    const updatedAt = check
      ? formatDeliveryCheckTimeLabel(check.checkedAt, referenceDate)
      : undefined;

    return {
      status: 'missed',
      statusLabel: STATUS_LABELS.missed,
      hasInteractiveDetails: Boolean(scheduledDate || reason || order.note || updatedAt),
      details: {
        statusLabel: STATUS_LABELS.missed,
        scheduledDate,
        missedDate: scheduledDate,
        reason,
        notes: order.note?.trim() || undefined,
        updatedAt,
      },
    };
  }

  if (todayCandidate) {
    const scheduledDate = formatStoreOrderDeliveryDate(todayCandidate.expectedDeliveryDate);

    return {
      status: 'today',
      statusLabel: STATUS_LABELS.today,
      hasInteractiveDetails: Boolean(
        scheduledDate || todayCandidate.note?.trim(),
      ),
      details: {
        statusLabel: STATUS_LABELS.today,
        scheduledDate,
        deliveryDate: scheduledDate,
        notes: todayCandidate.note?.trim() || undefined,
      },
    };
  }

  if (scheduledCandidate) {
    const scheduledDate = formatStoreOrderDeliveryDate(
      scheduledCandidate.expectedDeliveryDate,
    );

    return {
      status: 'scheduled',
      statusLabel: STATUS_LABELS.scheduled,
      hasInteractiveDetails: Boolean(
        scheduledDate || scheduledCandidate.note?.trim(),
      ),
      details: {
        statusLabel: STATUS_LABELS.scheduled,
        scheduledDate,
        notes: scheduledCandidate.note?.trim() || undefined,
      },
    };
  }

  const fallback = pickPrimaryPendingOrder(input.orders);

  if (!fallback) {
    return null;
  }

  const scheduledDate = formatStoreOrderDeliveryDate(fallback.expectedDeliveryDate);
  const isToday = isStoreOrderExpectedOnDate(fallback.expectedDeliveryDate, referenceDate);

  return {
    status: isToday ? 'today' : 'scheduled',
    statusLabel: isToday ? STATUS_LABELS.today : STATUS_LABELS.scheduled,
    hasInteractiveDetails: Boolean(scheduledDate || fallback.note?.trim()),
    details: {
      statusLabel: isToday ? STATUS_LABELS.today : STATUS_LABELS.scheduled,
      scheduledDate,
      deliveryDate: isToday ? scheduledDate : undefined,
      notes: fallback.note?.trim() || undefined,
    },
  };
}
