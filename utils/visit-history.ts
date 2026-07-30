import type { Store } from '@/types/store';
import { formatStoreAddress } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { VisitSkipReason } from '@/types/store-visit';
import { getVisitHistoryRowStatusLabel } from '@/utils/milemate-status';
import { getTodayDateString } from '@/utils/today-date';

export type VisitHistoryFilter = 'all' | 'completed' | 'skipped' | 'issues';

export type VisitHistoryItem = {
  id: string;
  workdayId: string;
  storeId: string;
  storeName: string;
  address: string;
  status: 'completed' | 'skipped';
  hasIssue: boolean;
  reason: string;
  resolvedAtMs: number;
  scheduledDate: string;
  skipReason?: VisitSkipReason;
};

export type VisitHistorySection = {
  dateKey: string;
  title: string;
  visitCount: number;
  items: VisitHistoryItem[];
};

export function isResolvedVisit(visit: StoreVisit): boolean {
  return visit.status === 'completed' || visit.status === 'skipped';
}

export function resolveVisitHistoryResolvedAtMs(visit: StoreVisit): number {
  if (typeof visit.completedAt === 'number') {
    return visit.completedAt;
  }

  return visit.updatedAt;
}

export function visitQualifiesAsIssue(visit: StoreVisit): boolean {
  return visit.notes.length > 0;
}

export function mapVisitToHistoryItem(
  visit: StoreVisit,
  store: Store | null,
): VisitHistoryItem | null {
  if (!isResolvedVisit(visit)) {
    return null;
  }

  const storeName = store?.name ?? 'Unknown store';
  const address = store ? formatStoreAddress(store) : 'Address unavailable';

  const hasIssue = visitQualifiesAsIssue(visit);
  const status = visit.status === 'completed' ? 'completed' : 'skipped';

  const reason = hasIssue
    ? 'Issue'
    : getVisitHistoryRowStatusLabel({
        status,
        skipReason: visit.skipReason,
      });

  return {
    id: visit.id,
    workdayId: visit.tripId ?? visit.scheduledDate,
    storeId: visit.storeId,
    storeName,
    address,
    status,
    hasIssue,
    reason,
    resolvedAtMs: resolveVisitHistoryResolvedAtMs(visit),
    scheduledDate: visit.scheduledDate,
    skipReason: visit.skipReason,
  };
}

export function buildVisitHistoryItems(
  visits: StoreVisit[],
  storesById: Record<string, Store | null | undefined>,
): VisitHistoryItem[] {
  return visits
    .map((visit) => mapVisitToHistoryItem(visit, storesById[visit.storeId] ?? null))
    .filter((item): item is VisitHistoryItem => item !== null)
    .sort((left, right) => right.resolvedAtMs - left.resolvedAtMs);
}

export function formatVisitHistoryDateKey(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) {
    return 'Today';
  }

  const today = parseDateKey(todayKey);
  const target = parseDateKey(dateKey);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 1) {
    return 'Yesterday';
  }

  return target.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function parseDateKeyForDisplay(dateKey: string): Date {
  return parseDateKey(dateKey);
}

export function matchesVisitHistoryFilter(
  item: VisitHistoryItem,
  filter: VisitHistoryFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'completed') {
    return item.status === 'completed';
  }

  if (filter === 'skipped') {
    return item.status === 'skipped';
  }

  return item.hasIssue;
}

export function buildVisitHistorySections(input: {
  filter: VisitHistoryFilter;
  items: VisitHistoryItem[];
  selectedDateKey: string | null;
  todayKey?: string;
}): VisitHistorySection[] {
  const todayKey = input.todayKey ?? getTodayDateString();
  const filtered = input.items.filter((item) =>
    matchesVisitHistoryFilter(item, input.filter),
  );

  const scoped = input.selectedDateKey
    ? filtered.filter((item) => item.scheduledDate === input.selectedDateKey)
    : filtered;

  const byDate = new Map<string, VisitHistoryItem[]>();

  for (const item of scoped) {
    const bucket = byDate.get(item.scheduledDate) ?? [];
    bucket.push(item);
    byDate.set(item.scheduledDate, bucket);
  }

  const dateKeys = [...byDate.keys()].sort((left, right) => right.localeCompare(left));

  return dateKeys.map((dateKey) => {
    const items = [...(byDate.get(dateKey) ?? [])].sort(
      (left, right) => right.resolvedAtMs - left.resolvedAtMs,
    );

    return {
      dateKey,
      title: formatVisitHistoryDateKey(dateKey, todayKey),
      visitCount: items.length,
      items,
    };
  });
}

export function buildDefaultSectionExpansion(
  sections: VisitHistorySection[],
  todayKey: string,
): Record<string, boolean> {
  const expansion: Record<string, boolean> = {};

  for (const section of sections) {
    expansion[section.dateKey] = section.dateKey === todayKey;
  }

  return expansion;
}

export function formatVisitHistoryRowAccessibilityLabel(item: VisitHistoryItem): string {
  const statusPart = item.hasIssue ? 'issue' : item.reason.toLowerCase();
  const reasonPart =
    item.status === 'skipped' && item.skipReason
      ? `, reason ${getVisitHistoryRowStatusLabel({ status: 'skipped', skipReason: item.skipReason }).toLowerCase()}`
      : '';

  return `${item.storeName}, ${item.address}, ${statusPart}${reasonPart}. Double tap for visit details.`;
}

export function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
