import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import { formatVisitCompletionTime } from '@/utils/coordinator-screen-presentation';
import { formatStoreOrderDeliveryDate, parseStoreOrderDateString } from '@/utils/store-order-presentation';
import { isStoreOrderExpectedOnDate } from '@/utils/store-order-delivery-presentation';
import { localCalendarDayKey } from '@/utils/local-calendar-date';
import { formatVisitDurationLabel } from '@/utils/visit-duration';

export type VisitLogStoreSnapshotCollapsedItem = {
  icon: 'calendar-outline' | 'cube-outline' | 'document-text-outline';
  text: string;
  tone: 'neutral' | 'orange';
};

export type VisitLogStoreSnapshotExpandedRow = {
  detail: string;
  detailTone?: 'neutral' | 'orange';
  icon: 'calendar-outline' | 'cube-outline' | 'document-text-outline';
  label: string;
  subDetail?: string;
};

export type VisitLogStoreSnapshotPresentation = {
  collapsedItems: VisitLogStoreSnapshotCollapsedItem[];
  deliveryRow: (VisitLogStoreSnapshotExpandedRow & { kind: 'delivery' }) | null;
  emptyMessage: string | null;
  hasAnyActivity: boolean;
  lastVisitRow: VisitLogStoreSnapshotExpandedRow | null;
  notesRow: (VisitLogStoreSnapshotExpandedRow & { hasMore: boolean; noteCount: number }) | null;
};

function formatShortVisitDate(completedAt: number): string {
  return new Date(completedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function formatCompletedVisitDateTime(completedAt: number): string {
  const datePart = new Date(completedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart =
    formatVisitCompletionTime(completedAt) ??
    new Date(completedAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

  return `${datePart} at ${timePart}`;
}

function buildDeliverySummary(input: {
  latestNotReceivedChecksByOrderId: Record<string, StoreOrderDeliveryCheck | null>;
  orderHistory: StoreOrder[];
  pendingOrders: StoreOrder[];
  reference?: Date;
}): string | null {
  const reference = input.reference ?? new Date();
  const allOrders = [...input.orderHistory, ...input.pendingOrders];

  const deliveredToday = allOrders.find((order) => {
    if (order.status !== 'delivered') {
      return false;
    }

    const stamp = order.confirmedAt ?? order.deliveredAt;

    if (!stamp) {
      return false;
    }

    const parsed = new Date(stamp);
    return !Number.isNaN(parsed.getTime()) && localCalendarDayKey(parsed) === localCalendarDayKey(reference);
  });

  if (deliveredToday) {
    return 'Delivered today';
  }

  const missedToday =
    allOrders.some((order) => {
      if (order.status !== 'missed' || !order.confirmedAt) {
        return false;
      }

      const parsed = new Date(order.confirmedAt);
      return !Number.isNaN(parsed.getTime()) && localCalendarDayKey(parsed) === localCalendarDayKey(reference);
    }) ||
    input.pendingOrders.some(
      (order) => input.latestNotReceivedChecksByOrderId[order.id] != null,
    );

  if (missedToday) {
    return 'Missed delivery';
  }

  const pendingToday = input.pendingOrders.filter(
    (order) =>
      order.status === 'pending' &&
      isStoreOrderExpectedOnDate(order.expectedDeliveryDate, reference),
  );

  if (pendingToday.length > 0) {
    return 'Delivery due today';
  }

  const nextPending = [...input.pendingOrders]
    .filter((order) => order.status === 'pending')
    .sort((left, right) => {
      const leftDate = parseStoreOrderDateString(left.expectedDeliveryDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDate = parseStoreOrderDateString(right.expectedDeliveryDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftDate - rightDate;
    })[0];

  if (nextPending) {
    return `Next delivery ${formatStoreOrderDeliveryDate(nextPending.expectedDeliveryDate)}`;
  }

  if (allOrders.length === 0) {
    return null;
  }

  return 'Nothing currently scheduled';
}

function collapsedDeliveryPresentation(summary: string): {
  text: string;
  tone: 'neutral' | 'orange';
} {
  if (summary === 'Delivery due today') {
    return { text: 'Due today', tone: 'orange' };
  }

  if (summary === 'Missed delivery') {
    return { text: 'Missed delivery', tone: 'orange' };
  }

  if (summary === 'Delivered today') {
    return { text: 'Delivered today', tone: 'neutral' };
  }

  return { text: summary, tone: 'neutral' };
}

function deliveryDetailTone(summary: string): 'neutral' | 'orange' {
  if (summary === 'Delivery due today' || summary === 'Missed delivery') {
    return 'orange';
  }

  return 'neutral';
}

export function buildVisitLogStoreSnapshot(input: {
  canonicalStoreId: string;
  lastCompletedVisit: StoreVisit | null;
  latestNotReceivedChecksByOrderId: Record<string, StoreOrderDeliveryCheck | null>;
  orderHistory: StoreOrder[];
  pendingOrders: StoreOrder[];
  visit: StoreVisit;
}): VisitLogStoreSnapshotPresentation {
  if (input.visit.storeId !== input.canonicalStoreId) {
    throw new Error('Visit Log store snapshot requires the canonical store visit.');
  }

  const noteCount = input.visit.notes.length;

  const lastCompletedAt =
    input.lastCompletedVisit?.status === 'completed' &&
    typeof input.lastCompletedVisit.completedAt === 'number'
      ? input.lastCompletedVisit.completedAt
      : null;

  const deliverySummary = buildDeliverySummary({
    orderHistory: input.orderHistory,
    pendingOrders: input.pendingOrders,
    latestNotReceivedChecksByOrderId: input.latestNotReceivedChecksByOrderId,
  });

  const collapsedItems: VisitLogStoreSnapshotCollapsedItem[] = [];

  if (lastCompletedAt != null) {
    collapsedItems.push({
      icon: 'calendar-outline',
      text: formatShortVisitDate(lastCompletedAt),
      tone: 'neutral',
    });
  }

  if (deliverySummary) {
    const deliveryCollapsed = collapsedDeliveryPresentation(deliverySummary);
    collapsedItems.push({
      icon: 'cube-outline',
      text: deliveryCollapsed.text,
      tone: deliveryCollapsed.tone,
    });
  }

  if (noteCount > 0) {
    collapsedItems.push({
      icon: 'document-text-outline',
      text: noteCount === 1 ? '1 note' : `${noteCount} notes`,
      tone: 'neutral',
    });
  }

  const hasAnyActivity =
    lastCompletedAt != null || deliverySummary != null || noteCount > 0;

  const lastVisitRow =
    lastCompletedAt != null
      ? {
          icon: 'calendar-outline' as const,
          label: 'Last visit',
          detail: formatCompletedVisitDateTime(lastCompletedAt),
          subDetail:
            input.lastCompletedVisit != null
              ? formatVisitDurationLabel(input.lastCompletedVisit) ?? undefined
              : undefined,
        }
      : null;

  const deliveryRow =
    deliverySummary != null
      ? {
          kind: 'delivery' as const,
          icon: 'cube-outline' as const,
          label: 'Delivery',
          detail: deliverySummary,
          detailTone: deliveryDetailTone(deliverySummary),
        }
      : null;

  const notesRow =
    noteCount > 0
      ? {
          icon: 'document-text-outline' as const,
          label: 'Notes',
          detail: noteCount === 1 ? '1 note' : `${noteCount} notes`,
          hasMore: noteCount > 1,
          noteCount,
        }
      : null;

  return {
    collapsedItems,
    deliveryRow,
    emptyMessage: hasAnyActivity ? null : 'No store activity yet',
    hasAnyActivity,
    lastVisitRow,
    notesRow,
  };
}
