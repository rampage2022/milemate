import type { StoreOrder, StoreOrderSummary } from '@/types/store-order';

const DATE_STRING_PATTERN = /^(\d{2})-(\d{2})-(\d{2})$/;

function expandTwoDigitYear(twoDigitYear: number): number {
  return 2000 + twoDigitYear;
}

export function formatStoreOrderDateString(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = `${date.getFullYear() % 100}`.padStart(2, '0');

  return `${month}-${day}-${year}`;
}

export function parseStoreOrderDateString(value: string): Date | null {
  const match = DATE_STRING_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = expandTwoDigitYear(Number(match[3]));
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function isValidStoreOrderDateString(value: string): boolean {
  return parseStoreOrderDateString(value) !== null;
}

export function sortPendingStoreOrders(orders: StoreOrder[]): StoreOrder[] {
  return [...orders].sort((left, right) => {
    const leftTime = parseStoreOrderDateString(left.expectedDeliveryDate)?.getTime() ?? 0;
    const rightTime = parseStoreOrderDateString(right.expectedDeliveryDate)?.getTime() ?? 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function filterPendingStoreOrders(orders: StoreOrder[]): StoreOrder[] {
  return orders.filter((order) => order.status === 'pending');
}

export function formatStoreOrderDeliveryDate(dateString: string): string {
  const parsed = parseStoreOrderDateString(dateString);

  if (!parsed) {
    return dateString;
  }

  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

export function toStoreOrderSummaries(orders: StoreOrder[]): StoreOrderSummary[] {
  return orders.map((order) => ({
    expectedDeliveryDate: order.expectedDeliveryDate,
    id: order.id,
  }));
}

export function validateCreateStoreOrderInput(input: {
  expectedDeliveryDate: string;
  note?: string;
  placedAt: string;
  storeId: string;
}): string | null {
  if (!input.storeId.trim()) {
    return 'Store is required.';
  }

  if (!isValidStoreOrderDateString(input.placedAt)) {
    return 'Enter a valid order placed date.';
  }

  if (!isValidStoreOrderDateString(input.expectedDeliveryDate)) {
    return 'Expected delivery date is required.';
  }

  return null;
}
