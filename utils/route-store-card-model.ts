import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import { resolveActiveWorkdayLegOriginStore, resolvePreviousStoreForRouteLeg } from '@/utils/active-workday-route-origin';
import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { distanceMiles } from '@/utils/distance';
import {
  estimateDriveMinutesBetweenCoordinates,
} from '@/utils/live-route-summary';
import type { RouteDeliveryChipModel } from '@/utils/route-store-delivery-signal';
import { formatDriveTime, formatEstimatedFinish } from '@/utils/route-optimization';
import { formatVisitCompletionTime } from '@/utils/coordinator-screen-presentation';

export type RouteStoreCardVariant =
  | 'current'
  | 'next'
  | 'pending'
  | 'completed'
  | 'skipped';

export type RouteStoreCardViewModel = {
  id: string;
  storeName: string;
  address: string;
  distanceLabel?: string;
  arrivalLabel?: string;
  delivery?: RouteDeliveryChipModel;
  variant: RouteStoreCardVariant;
  stopNumber: number;
  completedTimeLabel?: string;
  skippedTimeLabel?: string;
};

export function mapLiveStopStateToVariant(
  state: 'completed' | 'current' | 'upcoming' | 'skipped',
  input: {
    currentVisitId: string | null;
    nextVisitId: string | null;
    visitId: string;
  },
): RouteStoreCardVariant {
  if (state === 'completed') {
    return 'completed';
  }

  if (state === 'skipped') {
    return 'skipped';
  }

  if (state === 'current') {
    return 'current';
  }

  if (input.visitId === input.nextVisitId) {
    return 'next';
  }

  return 'pending';
}

function formatDistanceLabel(miles: number | null): string | undefined {
  if (miles === null || !Number.isFinite(miles) || miles <= 0) {
    return undefined;
  }

  return `${miles.toFixed(1)} mi`;
}

function formatArriveLabelFromMinutes(minutes: number | null, nowMs: number): string | undefined {
  if (minutes === null) {
    return undefined;
  }

  const arriveMs = nowMs + minutes * 60_000;
  const time = new Date(arriveMs).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `Arrive ${time}`;
}

function formatEtaMinutesLabel(minutes: number | null): string | undefined {
  if (minutes === null) {
    return undefined;
  }

  return `ETA ${formatDriveTime(minutes)}`;
}

export function buildRouteLegLabels(input: {
  currentVisitId: string | null;
  fromStore: Store | undefined;
  nowMs?: number;
  startLocation?: RouteLocation | null;
  targetVisit: StoreVisit;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): { arrivalLabel?: string; distanceLabel?: string } {
  const sorted = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );
  const targetIndex = sorted.findIndex((visit) => visit.id === input.targetVisit.id);

  if (targetIndex < 0) {
    return {};
  }

  const originStore =
    input.fromStore ??
    resolveActiveWorkdayLegOriginStore({
      startLocation: input.startLocation ?? null,
      storesById: input.storesById,
      visits: input.visits,
    });

  const previousStore = resolvePreviousStoreForRouteLeg({
    originStore,
    storesById: input.storesById,
    targetVisitId: input.targetVisit.id,
    visits: input.visits,
  });
  const targetStore = input.storesById[input.targetVisit.storeId];
  const legMinutes = legMinutesBetweenStores(previousStore, targetStore);
  const miles =
    previousStore &&
    targetStore &&
    previousStore.latitude !== undefined &&
    previousStore.longitude !== undefined &&
    targetStore.latitude !== undefined &&
    targetStore.longitude !== undefined
      ? distanceMiles(
          {
            latitude: previousStore.latitude,
            longitude: previousStore.longitude,
          },
          { latitude: targetStore.latitude, longitude: targetStore.longitude },
        )
      : null;

  return {
    distanceLabel: formatDistanceLabel(miles),
    arrivalLabel: formatEtaMinutesLabel(legMinutes),
  };
}

export function buildRouteStoreCardViewModel(input: {
  currentVisitId: string | null;
  delivery?: RouteDeliveryChipModel | null;
  fromStore?: Store;
  nextVisitId: string | null;
  startLocation?: RouteLocation | null;
  store: Store;
  variant: RouteStoreCardVariant;
  visit: StoreVisit;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): RouteStoreCardViewModel {
  const display = formatPlanningStopDisplay(input.store);
  const address = display.subtitle.length > 0 ? display.subtitle : display.title;

  const base: RouteStoreCardViewModel = {
    id: input.visit.id,
    storeName: display.title,
    address,
    delivery: input.delivery ?? undefined,
    variant: input.variant,
    stopNumber: input.visit.routeOrder,
  };

  if (input.variant === 'completed') {
    return {
      ...base,
      completedTimeLabel: formatVisitCompletionTime(input.visit.completedAt) ?? undefined,
    };
  }

  if (input.variant === 'skipped') {
    return {
      ...base,
      skippedTimeLabel: formatVisitCompletionTime(input.visit.completedAt) ?? undefined,
    };
  }

  if (input.variant === 'current') {
    return base;
  }

  const legLabels = buildRouteLegLabels({
    currentVisitId: input.currentVisitId,
    fromStore: input.fromStore,
    startLocation: input.startLocation,
    targetVisit: input.visit,
    visits: input.visits,
    storesById: input.storesById,
  });

  return {
    ...base,
    ...legLabels,
  };
}

export function formatRouteMetaLine(
  distanceLabel?: string,
  arrivalLabel?: string,
): string | null {
  const parts = [distanceLabel, arrivalLabel].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' · ');
}

export function formatEstimatedArrivalFromIso(iso: string | null | undefined): string | undefined {
  if (!iso) {
    return undefined;
  }

  const label = formatEstimatedFinish(iso);

  if (!label || label === '—') {
    return undefined;
  }

  return `Arrive ${label}`;
}

function legMinutesBetweenStores(from: Store | undefined, to: Store | undefined): number | null {
  return estimateDriveMinutesBetweenCoordinates(
    from?.latitude !== undefined && from?.longitude !== undefined
      ? { latitude: from.latitude, longitude: from.longitude }
      : undefined,
    to?.latitude !== undefined && to?.longitude !== undefined
      ? { latitude: to.latitude, longitude: to.longitude }
      : undefined,
  );
}
