import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import { formatVisitCompletionTime } from '@/utils/coordinator-screen-presentation';
import {
  formatRelativeVisitAge,
  formatVisitDateLabel,
} from '@/utils/store-visit-presentation';
import { formatStoreOrderDeliveryDate } from '@/utils/store-order-presentation';
import { getTodayDateString } from '@/utils/today-date';

export type VisitLogDeliveryTile = {
  accent: 'green' | 'orange';
  statusLine: string;
  timeLine: string;
  title: string;
};

export type VisitLogActionTile = {
  accentColor: string;
  icon: 'cube-outline' | 'document-text-outline' | 'camera-outline' | 'information-circle-outline';
  id: 'delivery' | 'notes' | 'photos' | 'store-info';
  metaLine: string;
  statusLine: string;
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
  hasDeliveryAlert: boolean;
  lastVisitDateLabel: string | null;
  lastVisitRelativeLabel: string | null;
  managerName: string;
  noteCount: number;
  notesLastLabel: string | null;
  photoCount: number;
  photosLastLabel: string | null;
  receivingHoursLabel: string;
  storeStatusBadge: string | null;
  storeStatusLabel: string;
};

function isTodayIsoDate(isoDate: string): boolean {
  return isoDate === getTodayDateString();
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
  orderHistory: StoreOrder[];
  pendingOrders: StoreOrder[];
  visit: StoreVisit;
}): VisitLogPresentation {
  const { visit, pendingOrders, orderHistory, lastCompletedVisit } = input;
  const checkInTime = formatVisitCompletionTime(visit.checkedInAt);
  const checkedInLabel = checkInTime ? `Checked In • ${checkInTime}` : 'Checked In';

  const noteCount = visit.notes.length;
  const lastNote = [...visit.notes].sort(
    (left, right) => right.createdAt - left.createdAt,
  )[0];
  const notesLastLabel = lastNote
    ? `Last: ${formatNoteTime(lastNote.createdAt)}`
    : null;

  const deliveredToday =
    [...orderHistory, ...pendingOrders].find((order) => {
      if (order.status !== 'delivered' || !order.deliveredAt) {
        return false;
      }

      const deliveredDay = order.deliveredAt.slice(0, 10);

      return deliveredDay === getTodayDateString();
    }) ?? null;
  const pendingToday = pendingOrders.filter(
    (order) =>
      order.status === 'pending' && isTodayIsoDate(order.expectedDeliveryDate),
  );

  const hasDeliveryAlert = pendingOrders.some(
    (order) => input.latestNotReceivedChecksByOrderId[order.id] != null,
  );

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

  return {
    checkedInLabel,
    deliveryDetail,
    deliveryTile,
    hasDeliveryAlert,
    lastVisitDateLabel,
    lastVisitRelativeLabel,
    managerName: 'Not added',
    noteCount,
    notesLastLabel,
    photoCount: 0,
    photosLastLabel: null,
    receivingHoursLabel: 'Not set',
    storeStatusBadge: 'Closes 10:00 PM',
    storeStatusLabel: 'Open',
  };
}

function buildPendingOrderExpectedLine(order: StoreOrder): string {
  return `Expected • ${formatStoreOrderDeliveryDate(order.expectedDeliveryDate)}`;
}

export function buildVisitLogActionTiles(
  presentation: VisitLogPresentation,
): VisitLogActionTile[] {
  const notesStatus =
    presentation.noteCount === 0
      ? 'Add a note'
      : presentation.noteCount === 1
        ? '1 Note'
        : `${presentation.noteCount} Notes`;

  return [
    {
      id: 'delivery',
      title: presentation.deliveryTile.title,
      statusLine: presentation.deliveryTile.statusLine,
      metaLine: presentation.deliveryTile.timeLine,
      accentColor:
        presentation.deliveryTile.accent === 'green'
          ? '#34C759'
          : '#FF9500',
      icon: 'cube-outline',
    },
    {
      id: 'notes',
      title: 'Notes',
      statusLine: notesStatus,
      metaLine: presentation.notesLastLabel ?? 'Tap to add',
      accentColor: '#AF52DE',
      icon: 'document-text-outline',
    },
    {
      id: 'photos',
      title: 'Photos',
      statusLine:
        presentation.photoCount === 0
          ? 'No photos'
          : presentation.photoCount === 1
            ? '1 Photo'
            : `${presentation.photoCount} Photos`,
      metaLine: presentation.photosLastLabel ?? 'Coming soon',
      accentColor: '#007AFF',
      icon: 'camera-outline',
    },
    {
      id: 'store-info',
      title: 'Store Info',
      statusLine: 'View Details',
      metaLine: 'Manager & more',
      accentColor: '#32D4BB',
      icon: 'information-circle-outline',
    },
  ];
}

export function applyVisitLogManagerName(
  presentation: VisitLogPresentation,
  managerName: string | undefined,
): VisitLogPresentation {
  const trimmed = managerName?.trim();

  return {
    ...presentation,
    managerName: trimmed && trimmed.length > 0 ? trimmed : 'Not added',
  };
}
