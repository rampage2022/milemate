import { formatStoreAddress, type Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  createWorkdayTemplateStopId,
  type WorkdayTemplate,
  type WorkdayTemplateStop,
} from '@/types/workday-template';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { normalizeFullAddressForMatching } from '@/utils/store-import/address-utils';

export type ResolvedWorkdayTemplateStop = {
  storeId: string;
  displayName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  sourceType?: WorkdayTemplateStop['sourceType'];
};

export function buildWorkdayTemplateStopsFromVisits(
  visits: StoreVisit[],
  storesById: Record<string, Store>,
): WorkdayTemplateStop[] {
  return [...visits]
    .sort((left, right) => left.routeOrder - right.routeOrder)
    .map((visit) => {
      const store = storesById[visit.storeId];

      if (store) {
        return {
          id: createWorkdayTemplateStopId(),
          storeId: store.id,
          displayName: getStoreDisplayName(store),
          address: formatStoreAddress(store),
          latitude: store.latitude,
          longitude: store.longitude,
          sourceType: 'store' as const,
        };
      }

      return {
        id: createWorkdayTemplateStopId(),
        storeId: visit.storeId,
        displayName: 'Stop',
        address: 'Address unavailable',
        sourceType: 'manual' as const,
      };
    });
}

export function resolveWorkdayTemplateStop(
  stop: WorkdayTemplateStop,
  store: Store | null | undefined,
): ResolvedWorkdayTemplateStop {
  if (stop.storeId && store) {
    return {
      storeId: store.id,
      displayName: getStoreDisplayName(store),
      address: formatStoreAddress(store),
      latitude: store.latitude ?? stop.latitude,
      longitude: store.longitude ?? stop.longitude,
      sourceType: stop.sourceType ?? 'store',
    };
  }

  if (stop.storeId) {
    return {
      storeId: stop.storeId,
      displayName: stop.displayName,
      address: stop.address,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sourceType: stop.sourceType ?? 'manual',
    };
  }

  const generatedStoreId = `store-template-${stop.id}`;

  return {
    storeId: generatedStoreId,
    displayName: stop.displayName,
    address: stop.address,
    latitude: stop.latitude,
    longitude: stop.longitude,
    sourceType: 'manual',
  };
}

export function normalizeWorkdayTemplateAddress(address: string): string {
  return normalizeFullAddressForMatching(address);
}

export function workdayTemplateStopMatchesResolvedStop(
  left: WorkdayTemplateStop | ResolvedWorkdayTemplateStop,
  right: WorkdayTemplateStop | ResolvedWorkdayTemplateStop,
): boolean {
  const leftStoreId = 'storeId' in left ? left.storeId : undefined;
  const rightStoreId = 'storeId' in right ? right.storeId : undefined;

  if (leftStoreId && rightStoreId && leftStoreId === rightStoreId) {
    return true;
  }

  const leftAddress = 'address' in left ? left.address : '';
  const rightAddress = 'address' in right ? right.address : '';

  if (!leftAddress.trim() || !rightAddress.trim()) {
    return false;
  }

  return (
    normalizeWorkdayTemplateAddress(leftAddress) ===
    normalizeWorkdayTemplateAddress(rightAddress)
  );
}

export function workdayTemplateStopMatchesVisit(
  stop: WorkdayTemplateStop,
  visit: StoreVisit,
  store: Store | undefined,
): boolean {
  if (stop.storeId && stop.storeId === visit.storeId) {
    return true;
  }

  if (!store) {
    return false;
  }

  return workdayTemplateStopMatchesResolvedStop(stop, {
    storeId: store.id,
    displayName: getStoreDisplayName(store),
    address: formatStoreAddress(store),
  });
}

export type AddMissingWorkdayTemplateStopsResult = {
  appendedStops: ResolvedWorkdayTemplateStop[];
  skippedCount: number;
};

export function selectMissingWorkdayTemplateStops(
  template: WorkdayTemplate,
  currentVisits: StoreVisit[],
  storesById: Record<string, Store>,
  storeLookup: Record<string, Store | null | undefined>,
): AddMissingWorkdayTemplateStopsResult {
  const appendedStops: ResolvedWorkdayTemplateStop[] = [];
  let skippedCount = 0;

  template.stops.forEach((stop) => {
    const resolved = resolveWorkdayTemplateStop(stop, storeLookup[stop.storeId ?? '']);

    const alreadyIncluded = currentVisits.some((visit) => {
      const store = storesById[visit.storeId];

      return workdayTemplateStopMatchesVisit(stop, visit, store);
    });

    if (alreadyIncluded) {
      skippedCount += 1;
      return;
    }

    appendedStops.push(resolved);
  });

  return {
    appendedStops,
    skippedCount,
  };
}

export function createStoreFromResolvedWorkdayTemplateStop(
  stop: ResolvedWorkdayTemplateStop,
): Store {
  const now = Date.now();
  const parts = stop.address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const addressLine1 = parts[0] ?? stop.displayName;
  const city = parts[1] ?? '';
  const statePostal = parts[2] ?? '';
  const [state = '', ...postalParts] = statePostal.split(/\s+/);

  return {
    id: stop.storeId,
    name: stop.displayName === stop.address ? '' : stop.displayName,
    addressLine1,
    city: city || 'Unknown',
    state: state || 'NA',
    postalCode: postalParts.join(' '),
    latitude: stop.latitude,
    longitude: stop.longitude,
    createdAt: now,
    updatedAt: now,
  };
}

export function createVisitFromResolvedWorkdayTemplateStop(
  stop: ResolvedWorkdayTemplateStop,
  routeOrder: number,
  scheduledDate: string,
): StoreVisit {
  const now = Date.now();

  return {
    id: `visit-${scheduledDate}-${routeOrder}-${stop.storeId}`,
    storeId: stop.storeId,
    scheduledDate,
    routeOrder,
    status: 'pending',
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
}
