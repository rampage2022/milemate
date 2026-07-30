import type { StoreOrder } from '@/types/store-order';

/** Pending orders are sorted by expected delivery; the first is shown on the summary card. */
export function resolveDisplayedPendingOrderId(orders: StoreOrder[]): string | null {
  return orders[0]?.id ?? null;
}
