import type { StoreGroup } from '@/types/store-group';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import {
  filterPendingStoreOrders,
  formatStoreOrderDeliveryDate,
  sortPendingStoreOrders,
} from '@/utils/store-order-presentation';
import {
  isStoreOrderExpectedOnDate,
  startOfLocalDay,
} from '@/utils/store-order-delivery-presentation';
import type { StoresMapPreviewModel } from '@/utils/stores-map-model';
import type { StoresMapSmartFilterIndex } from '@/utils/stores-map-smart-filter-index';
import {
  formatRelativeVisitAge,
  formatVisitDateLabel,
  resolveLastCompletedVisitForDisplay,
} from '@/utils/store-visit-presentation';

export type StoresMapSelectedStoreCardAlertTone = 'none' | 'warning' | 'critical';

export type StoresMapSelectedStoreCardMetricVisibility = {
  alert: boolean;
  lastDelivery: boolean;
  lastVisit: boolean;
  note: boolean;
  upcomingDelivery: boolean;
  workdayGroup: boolean;
};

export type StoresMapSelectedStoreCardModel = {
  address: string;
  alertLabel: string;
  alertTone: StoresMapSelectedStoreCardAlertTone;
  assignmentBadge: string;
  addToRouteAccessibilityLabel: string;
  isOnTodayRoute: boolean;
  lastDeliveryLabel: string;
  lastVisitLabel: string;
  metricVisibility: StoresMapSelectedStoreCardMetricVisibility;
  navigateAccessibilityLabel: string;
  notePreview: string;
  openStoreAccessibilityLabel: string;
  showCompactVisitFocus: boolean;
  storeId: string;
  storeName: string;
  storeNumberLabel: string | null;
  upcomingDeliveryLabel: string;
  viewNotesAccessibilityLabel: string;
  visitStatusLabel: string | null;
  workdayGroupLabel: string;
};

export type BuildStoresMapSelectedStoreCardModelInput = {
  activeGroupNames: string[];
  checksByOrderId?: Record<string, StoreOrderDeliveryCheck | null | undefined>;
  isOnTodayRoute?: boolean;
  orders: StoreOrder[];
  preview: StoresMapPreviewModel;
  referenceDate?: Date;
  resolvedVisits: StoreVisit[];
  smartFilterIndex: StoresMapSmartFilterIndex;
};

const NOTE_PREVIEW_MAX_LENGTH = 96;

export function truncateStoresMapNotePreview(text: string, maxLength = NOTE_PREVIEW_MAX_LENGTH): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatRelativeDeliveryDay(
  isoTimestamp: string,
  referenceDate = new Date(),
): string | null {
  const delivered = new Date(isoTimestamp);

  if (Number.isNaN(delivered.getTime())) {
    return null;
  }

  const deliveredDay = startOfLocalDay(delivered);
  const today = startOfLocalDay(referenceDate);
  const diffMs = today.getTime() - deliveredDay.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  return `${diffDays} days ago`;
}

function resolveUpcomingDeliveryLabel(
  orders: StoreOrder[],
  referenceDate: Date,
): string {
  const pending = sortPendingStoreOrders(filterPendingStoreOrders(orders));

  if (pending.length === 0) {
    return 'None scheduled';
  }

  const next = pending[0]!;
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isStoreOrderExpectedOnDate(next.expectedDeliveryDate, referenceDate)) {
    return 'Today';
  }

  if (isStoreOrderExpectedOnDate(next.expectedDeliveryDate, tomorrow)) {
    return 'Tomorrow';
  }

  return formatStoreOrderDeliveryDate(next.expectedDeliveryDate);
}

function resolveLastDeliveryLabel(orders: StoreOrder[]): string {
  const delivered = orders
    .filter((order) => order.status === 'delivered' && order.deliveredAt)
    .sort((left, right) => right.deliveredAt!.localeCompare(left.deliveredAt!))[0];

  if (!delivered?.deliveredAt) {
    return 'No delivery recorded';
  }

  return formatRelativeDeliveryDay(delivered.deliveredAt) ?? 'No delivery recorded';
}

function resolveNotePreview(input: {
  orders: StoreOrder[];
  resolvedVisits: StoreVisit[];
  storeId: string;
}): string {
  let latestNote: { createdAt: number; text: string } | null = null;

  for (const visit of input.resolvedVisits) {
    if (visit.storeId !== input.storeId) {
      continue;
    }

    for (const note of visit.notes) {
      if (!latestNote || note.createdAt > latestNote.createdAt) {
        latestNote = note;
      }
    }
  }

  const pendingWithNote = sortPendingStoreOrders(filterPendingStoreOrders(input.orders)).find(
    (order) => order.note && order.note.trim().length > 0,
  );

  if (latestNote?.text.trim()) {
    return truncateStoresMapNotePreview(latestNote.text);
  }

  if (pendingWithNote?.note?.trim()) {
    return truncateStoresMapNotePreview(pendingWithNote.note);
  }

  return 'No note';
}

function resolveLastVisitLabel(input: {
  activeVisit: StoreVisit | null;
  resolvedVisits: StoreVisit[];
  storeId: string;
}): string {
  const lastCompleted = resolveLastCompletedVisitForDisplay(
    input.resolvedVisits,
    input.storeId,
    input.activeVisit,
  );

  if (!lastCompleted?.completedAt) {
    return 'No previous visits';
  }

  return (
    formatRelativeVisitAge(lastCompleted.completedAt) ??
    formatVisitDateLabel(lastCompleted.completedAt)
  );
}

function shouldShowCompactVisitFocus(input: {
  notePreview: string;
  upcomingDeliveryLabel: string;
  workdayGroupLabel: string;
}): boolean {
  return (
    input.upcomingDeliveryLabel === 'None scheduled' &&
    input.notePreview === 'No note' &&
    input.workdayGroupLabel === 'Unassigned'
  );
}

function resolveAlert(input: {
  checksByOrderId: Record<string, StoreOrderDeliveryCheck | null | undefined>;
  orders: StoreOrder[];
  smartFilterIndex: StoresMapSmartFilterIndex;
  storeId: string;
}): { label: string; tone: StoresMapSelectedStoreCardAlertTone } {
  if (input.smartFilterIndex.missedDeliveryStoreIds.has(input.storeId)) {
    return { label: 'Missed delivery', tone: 'critical' };
  }

  const pending = filterPendingStoreOrders(input.orders);

  for (const order of pending) {
    if (input.checksByOrderId[order.id]) {
      return { label: 'Delivery not received', tone: 'warning' };
    }
  }

  return { label: 'None', tone: 'none' };
}

function resolveWorkdayGroupLabel(input: {
  activeGroupNames: string[];
  preview: StoresMapPreviewModel;
}): string {
  const workdayNames = input.preview.membershipRows.map((row) => row.name);
  const groupName = input.activeGroupNames[0];

  if (workdayNames.length === 0 && !groupName) {
    return 'Unassigned';
  }

  if (workdayNames.length === 1 && !groupName) {
    return workdayNames[0]!;
  }

  if (workdayNames.length === 0 && groupName) {
    return groupName;
  }

  const workdayPart =
    workdayNames.length === 1
      ? workdayNames[0]!
      : `${workdayNames.length} workdays`;

  if (groupName) {
    return `${workdayPart} · ${groupName}`;
  }

  return workdayPart;
}

function resolveGroupAssignmentBadge(activeGroupNames: string[]): string {
  if (activeGroupNames.length === 0) {
    return 'Unassigned';
  }

  if (activeGroupNames.length === 1) {
    return activeGroupNames[0]!;
  }

  return `${activeGroupNames.length} groups`;
}

export function resolveStoresMapSelectedStoreCardMetricVisibility(input: {
  alertTone: StoresMapSelectedStoreCardAlertTone;
  lastDeliveryLabel: string;
  lastVisitLabel: string;
  notePreview: string;
  upcomingDeliveryLabel: string;
  workdayGroupLabel: string;
}): StoresMapSelectedStoreCardMetricVisibility {
  return {
    alert: input.alertTone !== 'none',
    lastDelivery: input.lastDeliveryLabel !== 'No delivery recorded',
    lastVisit: input.lastVisitLabel !== 'No previous visits',
    note: input.notePreview !== 'No note',
    upcomingDelivery: input.upcomingDeliveryLabel !== 'None scheduled',
    workdayGroup: input.workdayGroupLabel !== 'Unassigned',
  };
}


export function buildStoresMapSelectedStoreCardModel(
  input: BuildStoresMapSelectedStoreCardModelInput,
): StoresMapSelectedStoreCardModel {
  const referenceDate = input.referenceDate ?? new Date();
  const storeId = input.preview.store.id;
  const storeOrders = input.orders.filter((order) => order.storeId === storeId);
  const checksByOrderId = input.checksByOrderId ?? {};
  const alert = resolveAlert({
    checksByOrderId,
    orders: storeOrders,
    smartFilterIndex: input.smartFilterIndex,
    storeId,
  });
  const storeName = getStoreDisplayName(input.preview.store);
  const lastDeliveryLabel = resolveLastDeliveryLabel(storeOrders);
  const notePreview = resolveNotePreview({
    orders: storeOrders,
    resolvedVisits: input.resolvedVisits,
    storeId,
  });
  const upcomingDeliveryLabel = resolveUpcomingDeliveryLabel(storeOrders, referenceDate);
  const workdayGroupLabel = resolveWorkdayGroupLabel({
    activeGroupNames: input.activeGroupNames,
    preview: input.preview,
  });
  const lastVisitLabel = resolveLastVisitLabel({
    activeVisit: input.preview.visit,
    resolvedVisits: input.resolvedVisits,
    storeId,
  });
  const showCompactVisitFocus = shouldShowCompactVisitFocus({
    notePreview,
    upcomingDeliveryLabel,
    workdayGroupLabel,
  });
  const metricVisibility = resolveStoresMapSelectedStoreCardMetricVisibility({
    alertTone: alert.tone,
    lastDeliveryLabel,
    lastVisitLabel,
    notePreview,
    upcomingDeliveryLabel,
    workdayGroupLabel,
  });
  const isOnTodayRoute = input.isOnTodayRoute === true;

  return {
    address: input.preview.address,
    alertLabel: alert.label,
    alertTone: alert.tone,
    assignmentBadge: resolveGroupAssignmentBadge(input.activeGroupNames),
    addToRouteAccessibilityLabel: isOnTodayRoute
      ? `${storeName} is already on today\u2019s route`
      : `Add ${storeName} to today\u2019s route`,
    isOnTodayRoute,
    lastDeliveryLabel,
    lastVisitLabel,
    metricVisibility,
    navigateAccessibilityLabel: `Navigate to ${storeName}`,
    notePreview,
    openStoreAccessibilityLabel: `Open ${storeName}`,
    showCompactVisitFocus,
    storeId,
    storeName,
    storeNumberLabel: input.preview.storeNumberLabel,
    upcomingDeliveryLabel,
    viewNotesAccessibilityLabel: `View notes for ${storeName}`,
    visitStatusLabel: input.preview.visit ? input.preview.visit.status : null,
    workdayGroupLabel,
  };
}
