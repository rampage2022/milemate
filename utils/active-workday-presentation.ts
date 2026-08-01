import { formatDurationDisplay } from '@/components/home/format-workday';
import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { formatVisitCompletionTime } from '@/utils/coordinator-screen-presentation';
import { resolveActiveWorkdayLegOriginStore } from '@/utils/active-workday-route-origin';
import { formatDriveTime, formatEstimatedFinish } from '@/utils/route-optimization';
import { estimateDriveMinutesBetweenCoordinates } from '@/utils/live-route-summary';
import { distanceMiles } from '@/utils/distance';
import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import { formatStoreAddress } from '@/types/store';

export type ActiveWorkdayStopRow = {
  address: string;
  globalIndex: number;
  isNextStop: boolean;
  milesLabel: string | null;
  etaLabel: string | null;
  storeId: string;
  storeName: string;
  visit: StoreVisit;
};

export type ActiveWorkdayCompletedRow = {
  completedTimeLabel: string | null;
  storeName: string;
  address: string;
  visitId: string;
};

export type ActiveWorkdaySkippedRow = {
  address: string;
  reasonLabel: string | null;
  storeName: string;
  visitId: string;
};

export type ActiveWorkdayMetrics = {
  completedCount: number;
  deliveriesScheduledToday: number;
  elapsedLabel: string;
  estTotalLabel: string;
  percentComplete: number;
  totalCount: number;
  totalDistanceLabel: string;
};

const PREVIEW_LIMIT = 3;

function estimateDriveMinutesBetweenStores(
  fromStore: Store | undefined,
  toStore: Store | undefined,
): number | null {
  if (!fromStore || !toStore) {
    return null;
  }

  return estimateDriveMinutesBetweenCoordinates(
    {
      latitude: fromStore.latitude ?? NaN,
      longitude: fromStore.longitude ?? NaN,
    },
    {
      latitude: toStore.latitude ?? NaN,
      longitude: toStore.longitude ?? NaN,
    },
  );
}

export function buildActiveWorkdayMetrics(input: {
  deliveriesScheduledToday: number;
  estimatedFinishAt: string | null;
  totalDistanceMiles: number;
  visits: StoreVisit[];
  workdayStartedAt: number | null;
}): ActiveWorkdayMetrics {
  const totalCount = input.visits.length;
  const completedCount = input.visits.filter(
    (visit) => visit.status === 'completed',
  ).length;
  const percentComplete =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const elapsedLabel =
    input.workdayStartedAt != null
      ? formatDurationDisplay(Date.now() - input.workdayStartedAt).value
      : '—';

  const estTotalLabel = input.estimatedFinishAt
    ? formatEstimatedFinish(input.estimatedFinishAt)
    : '—';

  const totalDistanceLabel =
    input.totalDistanceMiles > 0
      ? `${input.totalDistanceMiles.toFixed(1)} mi`
      : '— mi';

  return {
    completedCount,
    deliveriesScheduledToday: input.deliveriesScheduledToday,
    elapsedLabel,
    estTotalLabel,
    percentComplete,
    totalCount,
    totalDistanceLabel,
  };
}

function storeRowCopy(store: Store): { name: string; address: string } {
  const display = formatPlanningStopDisplay(store);

  return {
    name: display.title,
    address: display.subtitle || formatStoreAddress(store),
  };
}

export function buildActiveWorkdayLists(input: {
  currentVisitId: string | null;
  startLocation: RouteLocation | null;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
}): {
  completed: ActiveWorkdayCompletedRow[];
  remaining: ActiveWorkdayStopRow[];
  skipped: ActiveWorkdaySkippedRow[];
} {
  const sorted = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );

  const completed: ActiveWorkdayCompletedRow[] = [];
  const remaining: ActiveWorkdayStopRow[] = [];
  const skipped: ActiveWorkdaySkippedRow[] = [];

  let nextStopAssigned = false;
  let previousStore: Store | null = resolveActiveWorkdayLegOriginStore({
    startLocation: input.startLocation,
    storesById: input.storesById,
    visits: sorted,
  });

  sorted.forEach((visit, index) => {
    const store = input.storesById[visit.storeId];

    if (!store) {
      return;
    }

    const copy = storeRowCopy(store);
    const globalIndex = index + 1;

    if (visit.status === 'completed') {
      completed.push({
        visitId: visit.id,
        storeName: copy.name,
        address: copy.address,
        completedTimeLabel: formatVisitCompletionTime(visit.completedAt),
      });
      previousStore = store;
      return;
    }

    if (visit.status === 'skipped') {
      skipped.push({
        visitId: visit.id,
        storeName: copy.name,
        address: copy.address,
        reasonLabel: visit.skipReason?.replace(/_/g, ' ') ?? null,
      });
      return;
    }

    const isNextStop = !nextStopAssigned;
    if (isNextStop) {
      nextStopAssigned = true;
    }

    const legMinutes =
      previousStore !== null
        ? estimateDriveMinutesBetweenStores(previousStore, store)
        : input.startLocation &&
            typeof store.latitude === 'number' &&
            typeof store.longitude === 'number'
          ? estimateDriveMinutesBetweenCoordinates(
              {
                latitude: input.startLocation.latitude,
                longitude: input.startLocation.longitude,
              },
              { latitude: store.latitude, longitude: store.longitude },
            )
          : null;
    let milesLabel: string | null = null;

    if (previousStore) {
      if (
        typeof previousStore.latitude === 'number' &&
        typeof previousStore.longitude === 'number' &&
        typeof store.latitude === 'number' &&
        typeof store.longitude === 'number'
      ) {
        const miles = distanceMiles(
          { latitude: previousStore.latitude, longitude: previousStore.longitude },
          { latitude: store.latitude, longitude: store.longitude },
        );
        milesLabel = `${miles.toFixed(1)} mi`;
      }
    } else if (
      input.startLocation &&
      typeof store.latitude === 'number' &&
      typeof store.longitude === 'number'
    ) {
      const miles = distanceMiles(
        {
          latitude: input.startLocation.latitude,
          longitude: input.startLocation.longitude,
        },
        { latitude: store.latitude, longitude: store.longitude },
      );
      milesLabel = `${miles.toFixed(1)} mi`;
    }

    remaining.push({
      visit,
      globalIndex,
      isNextStop,
      storeId: store.id,
      storeName: copy.name,
      address: copy.address,
      milesLabel,
      etaLabel: legMinutes !== null ? `ETA ${formatDriveTime(legMinutes)}` : null,
    });

    previousStore = store;
  });

  return { completed, remaining, skipped };
}

export function sliceForPreview<T>(items: T[], expanded: boolean): T[] {
  if (expanded || items.length <= PREVIEW_LIMIT) {
    return items;
  }

  return items.slice(0, PREVIEW_LIMIT);
}
