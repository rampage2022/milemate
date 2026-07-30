import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  DEFAULT_PLANNED_VISIT_DURATION_MS,
  averageCompletedVisitDurationMs,
} from '@/utils/visit-duration';
import {
  estimateDriveMinutesBetweenCoordinates,
} from '@/utils/live-route-summary';
import { formatEstimatedFinish } from '@/utils/route-optimization';

export function estimateExpectedVisitDurationMs(visits: StoreVisit[]): number {
  return (
    averageCompletedVisitDurationMs(visits) ?? DEFAULT_PLANNED_VISIT_DURATION_MS
  );
}

export function buildDynamicEstimatedFinishAt(input: {
  nowMs?: number;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
  currentVisit: StoreVisit | null;
  endStore: Store | null;
}): string | null {
  const nowMs = input.nowMs ?? Date.now();
  const sorted = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );
  const visitDurationMs = estimateExpectedVisitDurationMs(sorted);
  const current =
    input.currentVisit ??
    sorted.find(
      (visit) => visit.status === 'current' || visit.status === 'checked_in',
    ) ??
    null;

  if (!current) {
    return null;
  }

  let cursorMs = nowMs;
  let cursorStore = input.storesById[current.storeId];

  if (current.status === 'checked_in' && typeof current.checkedInAt === 'number') {
    const elapsed = Math.max(0, nowMs - current.checkedInAt);
    const remainingAtStop = Math.max(0, visitDurationMs - elapsed);
    cursorMs += remainingAtStop;
  } else {
    cursorMs += visitDurationMs;
  }

  const currentIndex = sorted.findIndex((visit) => visit.id === current.id);
  const tail = sorted.slice(currentIndex + 1).filter(
    (visit) => visit.status === 'pending' || visit.status === 'current',
  );

  let fromStore = cursorStore;

  for (const visit of tail) {
    const toStore = input.storesById[visit.storeId];
    const legMinutes = estimateDriveMinutesBetweenCoordinates(
      fromStore?.latitude !== undefined && fromStore?.longitude !== undefined
        ? { latitude: fromStore.latitude, longitude: fromStore.longitude }
        : undefined,
      toStore?.latitude !== undefined && toStore?.longitude !== undefined
        ? { latitude: toStore.latitude, longitude: toStore.longitude }
        : undefined,
    );

    if (legMinutes !== null) {
      cursorMs += legMinutes * 60_000;
    }

    cursorMs += visitDurationMs;
    fromStore = toStore;
  }

  if (input.endStore && fromStore) {
    const returnMinutes = estimateDriveMinutesBetweenCoordinates(
      fromStore.latitude !== undefined && fromStore.longitude !== undefined
        ? { latitude: fromStore.latitude, longitude: fromStore.longitude }
        : undefined,
      input.endStore.latitude !== undefined &&
        input.endStore.longitude !== undefined
        ? {
            latitude: input.endStore.latitude,
            longitude: input.endStore.longitude,
          }
        : undefined,
    );

    if (returnMinutes !== null) {
      cursorMs += returnMinutes * 60_000;
    }
  }

  return new Date(cursorMs).toISOString();
}

export function formatDynamicEstimatedFinishLabel(
  estimatedFinishAt: string | null | undefined,
): string {
  if (!estimatedFinishAt) {
    return '—';
  }

  return formatEstimatedFinish(estimatedFinishAt);
}
