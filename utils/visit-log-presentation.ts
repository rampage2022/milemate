import type { Store } from '@/types/store';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import { formatVisitCompletionTime } from '@/utils/coordinator-screen-presentation';
import {
  formatRelativeVisitAge,
  formatVisitDateLabel,
} from '@/utils/store-visit-presentation';
import { formatStoreOrderDeliveryDate } from '@/utils/store-order-presentation';
import { isStoreOrderExpectedOnDate } from '@/utils/store-order-delivery-presentation';
import { localCalendarDayKey } from '@/utils/local-calendar-date';
import { buildVisitLogOperationalRows } from '@/utils/visit-log-summary-presentation';
import {
  buildVisitLogStoreIdentity,
  type VisitLogStoreIdentity,
} from '@/utils/store-identity-presentation';
import {
  type StoreOpenStatusPresentation,
} from '@/utils/store-operating-hours-presentation';

/** Visit photos are not implemented; keep sheet action honest. */
export const VISIT_LOG_PHOTO_CAPTURE_SUPPORTED = false;

export type VisitLogDeliveryTile = {
  accent: 'green' | 'orange';
  statusLine: string;
  timeLine: string;
  title: string;
};

export type VisitLogSheetActionId = 'delivery' | 'notes' | 'photos' | 'orders';

export type VisitLogSheetAction = {
  accessibilityHint?: string;
  accessibilityLabel: string;
  accentColor: string;
  disabled?: boolean;
  icon: 'cube-outline' | 'document-text-outline' | 'camera-outline' | 'list-outline';
  id: VisitLogSheetActionId;
  secondaryLine?: string | null;
  title: string;
};

export type VisitLogDetailDelivery = {
  label: string;
  tone: 'default' | 'orange';
  value: string;
};

export type VisitLogPresentation = {
  checkedInLabel: string | null;
  deliveryDetail: VisitLogDetailDelivery;
  deliveryTile: VisitLogDeliveryTile;
  deliveryActionSecondary: string | null;
  hasDeliveryAlert: boolean;
  lastVisitDateLabel: string | null;
  lastVisitMetadataLine: string | null;
  lastVisitRelativeLabel: string | null;
  managerDisplayName: string | null;
  noteCount: number;
  notesLastLabel: string | null;
  orderHistoryCount: number;
  photoCount: number;
  photosLastLabel: string | null;
  showManagerRow: boolean;
  showOperationalDivider: boolean;
  showStoreStatusRow: boolean;
  storeIdentity: VisitLogStoreIdentity;
  storeOpenStatus: StoreOpenStatusPresentation;
  storeStatusBadge: string | null;
  storeStatusLabel: string;
};

function isOrderDeliveredToday(order: StoreOrder, reference = new Date()): boolean {
  if (order.status !== 'delivered') {
    return false;
  }

  const stamp = order.confirmedAt ?? order.deliveredAt;

  if (!stamp) {
    return false;
  }

  const parsed = new Date(stamp);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return localCalendarDayKey(parsed) === localCalendarDayKey(reference);
}

function isOrderMissedToday(order: StoreOrder, reference = new Date()): boolean {
  if (order.status !== 'missed' || !order.confirmedAt) {
    return false;
  }

  const parsed = new Date(order.confirmedAt);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return localCalendarDayKey(parsed) === localCalendarDayKey(reference);
}

function formatNoteTime(createdAt: number): string {
  return (
    formatVisitCompletionTime(createdAt) ??
    new Date(createdAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  );
}

function formatDeliveredTileTime(deliveredAt: string | undefined): string {
  if (!deliveredAt) {
    return 'Today';
  }

  const parsed = new Date(deliveredAt);

  if (Number.isNaN(parsed.getTime())) {
    return 'Today';
  }

  const time =
    formatVisitCompletionTime(parsed.getTime()) ??
    parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return `Today • ${time}`;
}

export function buildVisitLogPresentation(input: {
  lastCompletedVisit: StoreVisit | null;
  latestNotReceivedChecksByOrderId: Record<string, StoreOrderDeliveryCheck | null>;
  nowMinuteOfDay?: number;
  orderHistory: StoreOrder[];
  pendingOrders: StoreOrder[];
  store: Store;
  visit: StoreVisit;
}): VisitLogPresentation {
  const { visit, pendingOrders, orderHistory, lastCompletedVisit, store } = input;
  const nowMinuteOfDay = input.nowMinuteOfDay;
  const checkInTime = formatVisitCompletionTime(visit.checkedInAt);
  const checkedInLabel =
    visit.status === 'checked_in'
      ? checkInTime
        ? `Checked In · ${checkInTime}`
        : 'Checked In'
      : null;

  const noteCount = visit.notes.length;
  const lastNote = [...visit.notes].sort(
    (left, right) => right.createdAt - left.createdAt,
  )[0];
  const notesLastLabel = lastNote
    ? `Last: ${formatNoteTime(lastNote.createdAt)}`
    : null;

  const deliveredToday =
    [...orderHistory, ...pendingOrders].find((order) => isOrderDeliveredToday(order)) ??
    null;
  const pendingToday = pendingOrders.filter(
    (order) =>
      order.status === 'pending' &&
      isStoreOrderExpectedOnDate(order.expectedDeliveryDate, new Date()),
  );

  const missedToday =
    [...orderHistory, ...pendingOrders].some((order) => isOrderMissedToday(order)) ||
    pendingOrders.some(
      (order) => input.latestNotReceivedChecksByOrderId[order.id] != null,
    );

  const hasDeliveryAlert = missedToday;

  let deliveryDetail: VisitLogDetailDelivery = {
    label: 'No delivery scheduled',
    tone: 'default',
    value: 'Delivery',
  };

  if (deliveredToday) {
    deliveryDetail = {
      label: 'Delivered',
      tone: 'default',
      value: 'Delivery complete',
    };
  } else if (pendingToday.length > 0) {
    deliveryDetail = {
      label: 'Scheduled Today',
      tone: 'orange',
      value: 'Delivery',
    };
  } else if (pendingOrders.length > 0) {
    deliveryDetail = {
      label: formatStoreOrderDeliveryDate(pendingOrders[0]!.expectedDeliveryDate),
      tone: 'default',
      value: 'Delivery',
    };
  }

  let deliveryTile: VisitLogDeliveryTile = {
    accent: 'orange',
    statusLine: 'Nothing due',
    timeLine: 'Log a delivery when ready',
    title: 'Delivery',
  };

  if (deliveredToday) {
    deliveryTile = {
      accent: 'green',
      statusLine: 'Delivered',
      timeLine: formatDeliveredTileTime(deliveredToday.deliveredAt),
      title: 'Delivery',
    };
  } else if (pendingToday.length > 0) {
    deliveryTile = {
      accent: 'orange',
      statusLine: 'Scheduled Today',
      timeLine: `Expected • ${formatStoreOrderDeliveryDate(pendingToday[0]!.expectedDeliveryDate)}`,
      title: 'Delivery',
    };
  } else if (pendingOrders.length > 0) {
    deliveryTile = {
      accent: 'orange',
      statusLine: 'Pending',
      timeLine: buildPendingOrderExpectedLine(pendingOrders[0]!),
      title: 'Delivery',
    };
  }

  const lastVisitDateLabel =
    lastCompletedVisit?.completedAt != null
      ? formatVisitDateLabel(lastCompletedVisit.completedAt)
      : null;
  const lastVisitRelativeLabel =
    lastCompletedVisit?.completedAt != null
      ? formatRelativeVisitAge(lastCompletedVisit.completedAt)
      : null;
  const lastVisitMetadataLine = formatVisitLogLastVisitMetadataLine(lastCompletedVisit);

  const operational = buildVisitLogOperationalRows({
    managerName: store.managerName,
    nowMinuteOfDay,
    store,
  });

  const deliveryActionSecondary = buildDeliveryActionSecondaryLine({
    deliveredToday,
    hasDeliveryAlert,
    pendingToday,
  });

  return {
    checkedInLabel,
    deliveryDetail,
    deliveryTile,
    deliveryActionSecondary,
    hasDeliveryAlert,
    lastVisitDateLabel,
    lastVisitMetadataLine,
    lastVisitRelativeLabel,
    managerDisplayName: operational.managerDisplayName,
    noteCount,
    notesLastLabel,
    orderHistoryCount: orderHistory.length,
    photoCount: 0,
    photosLastLabel: null,
    showManagerRow: operational.showManagerRow,
    showOperationalDivider: operational.showOperationalDivider,
    showStoreStatusRow: operational.showStoreStatusRow,
    storeIdentity: buildVisitLogStoreIdentity(store),
    storeOpenStatus: operational.storeOpenStatus,
    storeStatusBadge: operational.storeOpenStatus.badgeText,
    storeStatusLabel: operational.storeOpenStatus.statusLabel,
  };
}

function buildDeliveryActionSecondaryLine(input: {
  deliveredToday: StoreOrder | null;
  hasDeliveryAlert: boolean;
  pendingToday: StoreOrder[];
}): string | null {
  if (input.deliveredToday) {
    return 'Delivered today';
  }

  if (input.hasDeliveryAlert) {
    return 'Missed delivery';
  }

  if (input.pendingToday.length > 0) {
    return 'Scheduled today';
  }

  return 'Nothing due today';
}

export function formatVisitLogLastVisitMetadataLine(
  lastCompletedVisit: StoreVisit | null,
): string | null {
  if (!lastCompletedVisit || typeof lastCompletedVisit.completedAt !== 'number') {
    return null;
  }

  const completedAt = lastCompletedVisit.completedAt;
  const datePart = new Date(completedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
  const timePart =
    formatVisitCompletionTime(completedAt) ??
    new Date(completedAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

  return `Last visit · ${datePart} at ${timePart}`;
}

function buildPendingOrderExpectedLine(order: StoreOrder): string {
  return `Expected • ${formatStoreOrderDeliveryDate(order.expectedDeliveryDate)}`;
}

export function buildVisitLogSheetActions(
  presentation: VisitLogPresentation,
): VisitLogSheetAction[] {
  const notesSecondary =
    presentation.noteCount === 0
      ? null
      : presentation.noteCount === 1
        ? '1 note'
        : `${presentation.noteCount} notes`;

  const photoTitle = VISIT_LOG_PHOTO_CAPTURE_SUPPORTED ? 'Add Photo' : 'Photos';
  const photoSecondary = VISIT_LOG_PHOTO_CAPTURE_SUPPORTED
    ? presentation.photoCount === 0
      ? 'Add a photo'
      : presentation.photoCount === 1
        ? '1 photo'
        : `${presentation.photoCount} photos`
    : 'Coming soon';

  const ordersSecondary =
    presentation.orderHistoryCount === 0
      ? 'No orders yet'
      : presentation.orderHistoryCount === 1
        ? '1 order'
        : `${presentation.orderHistoryCount} orders`;

  return [
    {
      id: 'delivery',
      title: 'Log Delivery',
      secondaryLine: presentation.deliveryActionSecondary,
      accentColor: '#FF9500',
      icon: 'cube-outline',
      accessibilityLabel: 'Log Delivery',
      accessibilityHint: presentation.deliveryActionSecondary ?? undefined,
    },
    {
      id: 'notes',
      title: 'Add Note',
      secondaryLine: notesSecondary,
      accentColor: '#AF52DE',
      icon: 'document-text-outline',
      accessibilityLabel:
        presentation.noteCount > 0
          ? `Add Note, ${presentation.noteCount} notes on this visit`
          : 'Add Note',
    },
    {
      id: 'photos',
      title: photoTitle,
      secondaryLine: photoSecondary,
      accentColor: '#007AFF',
      icon: 'camera-outline',
      disabled: !VISIT_LOG_PHOTO_CAPTURE_SUPPORTED,
      accessibilityLabel: VISIT_LOG_PHOTO_CAPTURE_SUPPORTED
        ? photoTitle
        : 'Photos, coming soon, not available',
      accessibilityHint: VISIT_LOG_PHOTO_CAPTURE_SUPPORTED
        ? undefined
        : 'Photo capture is not available yet',
    },
    {
      id: 'orders',
      title: 'Orders',
      secondaryLine: ordersSecondary,
      accentColor: '#32D4BB',
      icon: 'list-outline',
      accessibilityLabel: 'Orders',
      accessibilityHint: 'View order history for this store',
    },
  ];
}

export function visitLogSheetActionIds(actions: VisitLogSheetAction[]): VisitLogSheetActionId[] {
  return actions.map((action) => action.id);
}
