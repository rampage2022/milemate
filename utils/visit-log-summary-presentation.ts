import type { Store } from '@/types/store';
import { buildVisitLogManagerContactPresentation } from '@/utils/visit-log-manager-contact';
import {
  buildStoreOpenStatusPresentation,
  normalizeStoreOperatingHours,
  type StoreOpenStatusPresentation,
} from '@/utils/store-operating-hours-presentation';

export function hasDefinedStoreOperatingHours(store: Store): boolean {
  return normalizeStoreOperatingHours(store) !== null;
}

export function resolveVisitLogManagerDisplayName(
  managerName: string | undefined,
): string | null {
  const trimmed = managerName?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

export function buildVisitLogOperationalRows(input: {
  managerName: string | undefined;
  nowMinuteOfDay?: number;
  store: Store;
}): {
  showManagerRow: boolean;
  showOperationalDivider: boolean;
  showStoreStatusRow: boolean;
  managerDisplayName: string | null;
  storeOpenStatus: StoreOpenStatusPresentation;
} {
  const hours = normalizeStoreOperatingHours(input.store);
  const showStoreStatusRow = hours !== null;
  const managerDisplayName = resolveVisitLogManagerDisplayName(input.managerName);
  const managerContact = buildVisitLogManagerContactPresentation({
    ...input.store,
    managerName: input.managerName ?? input.store.managerName,
  });
  const showManagerRow = managerContact.showRow;
  const showOperationalDivider = showStoreStatusRow || showManagerRow;

  const storeOpenStatus = buildStoreOpenStatusPresentation({
    hours,
    nowMinuteOfDay: input.nowMinuteOfDay,
  });

  return {
    managerDisplayName,
    showManagerRow,
    showOperationalDivider,
    showStoreStatusRow,
    storeOpenStatus,
  };
}
