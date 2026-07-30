import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import {
  formatStoreOrderDeliveryDate,
  parseStoreOrderDateString,
} from '@/utils/store-order-presentation';

export type PendingOrderCardPresentation = {
  checkedLabel: string | null;
  expectedLine: string | null;
  headline: string;
  secondaryLabel: string | null;
};

export function startOfLocalDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function isStoreOrderOverdue(
  expectedDeliveryDate: string,
  referenceDate = new Date(),
): boolean {
  const expected = parseStoreOrderDateString(expectedDeliveryDate);

  if (!expected) {
    return false;
  }

  const referenceDay = startOfLocalDay(referenceDate);
  const expectedDay = startOfLocalDay(expected);

  return referenceDay.getTime() > expectedDay.getTime();
}

export function isStoreOrderExpectedOnDate(
  expectedDeliveryDate: string,
  referenceDate: Date,
): boolean {
  const expected = parseStoreOrderDateString(expectedDeliveryDate);

  if (!expected) {
    return false;
  }

  return startOfLocalDay(expected).getTime() === startOfLocalDay(referenceDate).getTime();
}

export function formatDeliveryCheckTimeLabel(
  checkedAt: string,
  referenceDate = new Date(),
): string {
  const checked = new Date(checkedAt);

  if (Number.isNaN(checked.getTime())) {
    return 'Checked recently';
  }

  const timeLabel = checked.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const checkedDay = startOfLocalDay(checked);
  const today = startOfLocalDay(referenceDate);

  if (checkedDay.getTime() === today.getTime()) {
    return `Checked Today at ${timeLabel}`;
  }

  const weekday = checked.toLocaleDateString(undefined, { weekday: 'short' });
  return `Checked ${weekday} at ${timeLabel}`;
}

export function buildPendingOrderCardPresentation(input: {
  latestNotReceivedCheck: StoreOrderDeliveryCheck | null;
  order: StoreOrder;
  referenceDate?: Date;
}): PendingOrderCardPresentation {
  const referenceDate = input.referenceDate ?? new Date();
  const expectedDate = formatStoreOrderDeliveryDate(input.order.expectedDeliveryDate);
  const isOverdue = isStoreOrderOverdue(input.order.expectedDeliveryDate, referenceDate);
  const hasNotReceived = input.latestNotReceivedCheck !== null;
  const checkedLabel = hasNotReceived
    ? formatDeliveryCheckTimeLabel(input.latestNotReceivedCheck!.checkedAt, referenceDate)
    : null;

  if (hasNotReceived && isOverdue) {
    return {
      headline: 'Overdue Delivery',
      expectedLine: null,
      checkedLabel,
      secondaryLabel: 'Not received on last check',
    };
  }

  if (hasNotReceived) {
    return {
      headline: 'Delivery Not Received',
      expectedLine: `Expected ${expectedDate}`,
      checkedLabel,
      secondaryLabel: 'Still Pending',
    };
  }

  if (isOverdue) {
    return {
      headline: 'Overdue Delivery',
      expectedLine: `Expected ${expectedDate}`,
      checkedLabel: null,
      secondaryLabel: null,
    };
  }

  return {
    headline: 'Pending Order',
    expectedLine: null,
    checkedLabel: null,
    secondaryLabel: null,
  };
}

export function buildPendingOrderExpectedLine(order: StoreOrder): string {
  return `Expected ${formatStoreOrderDeliveryDate(order.expectedDeliveryDate)}`;
}
