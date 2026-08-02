import type { StoreOrder } from '@/types/store-order';
import type { StoreVisit } from '@/types/store-visit';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';
import { getVisitSkipReasonLabel } from '@/utils/visit-skip-reason-labels';

export const VISIT_LOG_RECENT_VISITS_LIMIT = 3;

export type VisitLogRecentVisitRow = {
  dateStatusLine: string;
  detailLine: string | null;
  id: string;
  status: 'completed' | 'skipped';
  visitId: string;
};

function isResolvedVisit(visit: StoreVisit): boolean {
  return visit.status === 'completed' || visit.status === 'skipped';
}

function resolveVisitHistoryResolvedAtMs(visit: StoreVisit): number {
  if (typeof visit.completedAt === 'number') {
    return visit.completedAt;
  }

  return visit.updatedAt;
}

function computeRecentVisitDurationMs(visit: StoreVisit): number | null {
  if (
    typeof visit.visitDurationMs === 'number' &&
    Number.isFinite(visit.visitDurationMs)
  ) {
    return visit.visitDurationMs;
  }

  if (
    typeof visit.checkedInAt === 'number' &&
    typeof visit.completedAt === 'number' &&
    visit.completedAt >= visit.checkedInAt
  ) {
    return visit.completedAt - visit.checkedInAt;
  }

  return null;
}

function formatRecentVisitDurationLabel(visit: StoreVisit): string | null {
  const durationMs = computeRecentVisitDurationMs(visit);

  if (durationMs === null || durationMs <= 0) {
    return null;
  }

  const totalMinutes = Math.max(1, Math.round(durationMs / 60_000));

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
  }

  return `${totalMinutes} min`;
}

function formatRecentVisitDate(resolvedAtMs: number): string {
  return new Date(resolvedAtMs).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function resolveVisitDeliverySummary(
  visit: StoreVisit,
  orders: StoreOrder[],
): string | null {
  if (visit.status !== 'completed') {
    return null;
  }

  const deliveredOnDay = orders.filter((order) => {
    if (order.status !== 'delivered' || !order.deliveredAt) {
      return false;
    }

    return order.deliveredAt.slice(0, 10) === visit.scheduledDate;
  });

  if (deliveredOnDay.length === 0) {
    return null;
  }

  return 'Delivery completed';
}

function buildRecentVisitDetailLine(
  visit: StoreVisit,
  orders: StoreOrder[],
): string | null {
  const parts: string[] = [];

  const duration = formatRecentVisitDurationLabel(visit);

  if (duration) {
    parts.push(duration);
  }

  const deliverySummary = resolveVisitDeliverySummary(visit, orders);

  if (deliverySummary) {
    parts.push(deliverySummary);
  }

  const noteCount = visit.notes.length;

  if (noteCount > 0) {
    parts.push(noteCount === 1 ? '1 note' : `${noteCount} notes`);
  }

  if (visit.status === 'skipped') {
    const skipLabel = getVisitSkipReasonLabel(visit.skipReason);

    if (skipLabel) {
      parts.push(skipLabel);
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' · ');
}

function dedupeAliasVisitRecords(
  visits: StoreVisit[],
  storeIdRemap: ReadonlyMap<string, string>,
): StoreVisit[] {
  const byKey = new Map<string, StoreVisit>();

  for (const visit of visits) {
    const canonicalStoreId = resolveRemappedStoreId(visit.storeId, storeIdRemap);
    const key = `${canonicalStoreId}:${visit.scheduledDate}:${visit.status}`;
    const existing = byKey.get(key);
    const resolvedAt = resolveVisitHistoryResolvedAtMs(visit);

    if (
      !existing ||
      resolvedAt > resolveVisitHistoryResolvedAtMs(existing)
    ) {
      byKey.set(key, visit);
    }
  }

  return [...byKey.values()];
}

export function buildVisitLogRecentVisits(input: {
  activeVisit: StoreVisit | null;
  canonicalStoreId: string;
  orders: StoreOrder[];
  storeIdRemap: ReadonlyMap<string, string>;
  visits: StoreVisit[];
}): {
  rows: VisitLogRecentVisitRow[];
  totalMatchingCount: number;
} {
  const activeVisitId =
    input.activeVisit &&
    input.activeVisit.status !== 'completed' &&
    input.activeVisit.status !== 'skipped'
      ? input.activeVisit.id
      : null;

  const matching = dedupeAliasVisitRecords(
    input.visits.filter((visit) => {
      if (!isResolvedVisit(visit)) {
        return false;
      }

      if (activeVisitId && visit.id === activeVisitId) {
        return false;
      }

      const canonicalVisitStoreId = resolveRemappedStoreId(
        visit.storeId,
        input.storeIdRemap,
      );

      return canonicalVisitStoreId === input.canonicalStoreId;
    }),
    input.storeIdRemap,
  ).sort(
    (left, right) =>
      resolveVisitHistoryResolvedAtMs(right) -
      resolveVisitHistoryResolvedAtMs(left),
  );

  const rows = matching.slice(0, VISIT_LOG_RECENT_VISITS_LIMIT).map((visit) => {
    const resolvedAt = resolveVisitHistoryResolvedAtMs(visit);
    const statusLabel = visit.status === 'completed' ? 'Completed' : 'Skipped';

    return {
      id: visit.id,
      visitId: visit.id,
      status: (visit.status === 'completed' ? 'completed' : 'skipped') as
        | 'completed'
        | 'skipped',
      dateStatusLine: `${formatRecentVisitDate(resolvedAt)} · ${statusLabel}`,
      detailLine: buildRecentVisitDetailLine(visit, input.orders),
    };
  });

  return {
    rows,
    totalMatchingCount: matching.length,
  };
}
