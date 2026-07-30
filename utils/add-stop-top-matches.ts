import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import { distanceMiles } from '@/utils/distance';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';

export type AddStopTopMatch = {
  distanceMiles: number | null;
  store: Store;
  subtitle: string;
  title: string;
};

function resolveDistanceAnchor(
  startLocation: RouteLocation | null,
): { latitude: number; longitude: number } | null {
  if (
    !startLocation ||
    !Number.isFinite(startLocation.latitude) ||
    !Number.isFinite(startLocation.longitude)
  ) {
    return null;
  }

  return {
    latitude: startLocation.latitude,
    longitude: startLocation.longitude,
  };
}

export function buildAddStopTopMatches(input: {
  excludeStoreIds: Set<string>;
  limit?: number;
  startLocation: RouteLocation | null;
  stores: Store[];
}): AddStopTopMatch[] {
  const anchor = resolveDistanceAnchor(input.startLocation);
  const limit = input.limit ?? 8;

  const candidates = input.stores
    .filter((store) => !input.excludeStoreIds.has(store.id))
    .map((store) => {
      const display = formatPlanningStopDisplay(store);
      let distance: number | null = null;

      if (
        anchor &&
        typeof store.latitude === 'number' &&
        typeof store.longitude === 'number' &&
        Number.isFinite(store.latitude) &&
        Number.isFinite(store.longitude)
      ) {
        distance = distanceMiles(anchor, {
          latitude: store.latitude,
          longitude: store.longitude,
        });
      }

      return {
        distanceMiles: distance,
        store,
        subtitle: display.subtitle,
        title: getStoreDisplayName(store),
      };
    });

  candidates.sort((left, right) => {
    if (left.distanceMiles === null && right.distanceMiles === null) {
      return left.title.localeCompare(right.title);
    }

    if (left.distanceMiles === null) {
      return 1;
    }

    if (right.distanceMiles === null) {
      return -1;
    }

    return left.distanceMiles - right.distanceMiles;
  });

  return candidates.slice(0, limit);
}

export function formatAddStopDistanceLabel(distanceMiles: number | null): string | null {
  if (distanceMiles === null || !Number.isFinite(distanceMiles)) {
    return null;
  }

  return `${distanceMiles.toFixed(1)} mi`;
}
