import { getLatestNotReceivedCheckForOrder } from '@/services/store-order-delivery-checks';
import { getAllStoreOrders } from '@/services/store-orders';
import { getLastCompletedVisitForStore } from '@/services/store-visits';
import { resolveRouteDeliveryChipModel } from '@/utils/route-store-delivery-signal';
import {
  isStoreOrderExpectedOnDate,
  startOfLocalDay,
} from '@/utils/store-order-delivery-presentation';

export type WorkdayPreviewInsightRow = {
  id: string;
  kind: 'missed_deliveries' | 'visit_notes';
  subtitle: string;
  title: string;
};

export type WorkdayPreviewInsights = {
  deliveriesScheduledToday: number;
  thingsToKnow: WorkdayPreviewInsightRow[];
};

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function previousLocalDateKey(reference: Date): string {
  const copy = new Date(reference);
  copy.setDate(copy.getDate() - 1);

  return formatDateKey(copy);
}

export async function loadWorkdayPreviewInsights(input: {
  routeStoreIds: string[];
  referenceDate?: Date;
}): Promise<WorkdayPreviewInsights> {
  const referenceDate = input.referenceDate ?? new Date();
  const todayStart = startOfLocalDay(referenceDate);
  const yesterdayKey = previousLocalDateKey(referenceDate);
  const routeStoreIds = new Set(input.routeStoreIds);
  const yesterdayStart = startOfLocalDay(new Date(`${yesterdayKey}T12:00:00`));

  const allOrders = await getAllStoreOrders();
  const relevantOrders = allOrders.filter((order) => routeStoreIds.has(order.storeId));

  let deliveriesScheduledToday = 0;

  for (const order of relevantOrders) {
    if (order.status !== 'pending') {
      continue;
    }

    if (isStoreOrderExpectedOnDate(order.expectedDeliveryDate, todayStart)) {
      deliveriesScheduledToday += 1;
    }
  }

  const checksByOrderId: Record<string, Awaited<ReturnType<typeof getLatestNotReceivedCheckForOrder>>> =
    {};

  await Promise.all(
    relevantOrders.map(async (order) => {
      checksByOrderId[order.id] = await getLatestNotReceivedCheckForOrder(order.id);
    }),
  );

  const missedDeliveryStoreIds = new Set<string>();

  for (const storeId of routeStoreIds) {
    const orders = relevantOrders.filter((order) => order.storeId === storeId);
    const chip = resolveRouteDeliveryChipModel({
      orders,
      checksByOrderId,
      referenceDate,
    });

    if (chip?.status === 'missed') {
      missedDeliveryStoreIds.add(storeId);
    }
  }

  const missedYesterdayStores = new Set<string>();

  for (const storeId of routeStoreIds) {
    const orders = relevantOrders.filter((order) => order.storeId === storeId);
    const hadOrderDueYesterday = orders.some(
      (order) =>
        order.status === 'pending' &&
        isStoreOrderExpectedOnDate(order.expectedDeliveryDate, yesterdayStart),
    );

    if (hadOrderDueYesterday && missedDeliveryStoreIds.has(storeId)) {
      missedYesterdayStores.add(storeId);
    }
  }

  let notesStoreCount = 0;

  await Promise.all(
    [...routeStoreIds].map(async (storeId) => {
      const lastVisit = await getLastCompletedVisitForStore(storeId, null);

      if (lastVisit && lastVisit.notes.length > 0) {
        notesStoreCount += 1;
      }
    }),
  );

  const thingsToKnow: WorkdayPreviewInsightRow[] = [];

  const missedCount = missedYesterdayStores.size || missedDeliveryStoreIds.size;

  if (missedCount > 0) {
    thingsToKnow.push({
      id: 'missed-deliveries',
      kind: 'missed_deliveries',
      title: `${missedCount} store${missedCount === 1 ? '' : 's'} had a missed delivery yesterday`,
      subtitle: 'Check notes before arrival',
    });
  }

  if (notesStoreCount > 0) {
    thingsToKnow.push({
      id: 'visit-notes',
      kind: 'visit_notes',
      title: `${notesStoreCount} store${notesStoreCount === 1 ? '' : 's'} have notes from last visit`,
      subtitle: 'Tap to review',
    });
  }

  return {
    deliveriesScheduledToday,
    thingsToKnow,
  };
}
