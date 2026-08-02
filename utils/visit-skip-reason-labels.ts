import type { VisitSkipReason } from '@/types/store-visit';

export const VISIT_SKIP_REASON_LABELS: Record<VisitSkipReason, string> = {
  store_closed: 'Store closed',
  receiving_closed: 'Receiving closed',
  no_delivery: 'Delivery unavailable',
  manager_unavailable: 'Manager unavailable',
  unable_to_access: 'Unable to access store',
  return_later: 'Return Later',
  time_constraint: 'Time Constraint',
  route_changed: 'Route Changed',
  other: 'Other',
};

export function getVisitSkipReasonLabel(
  reason: VisitSkipReason | undefined,
): string | null {
  if (!reason) {
    return null;
  }

  return VISIT_SKIP_REASON_LABELS[reason] ?? null;
}
