import type { Store } from '@/types/store';
import { formatMinutesOfDayForDisplay } from '@/utils/store-receiving-restriction';
import {
  getLocalMinuteOfDay,
  isOpenAtMinuteOfDay,
  isValidMinuteOfDay,
} from '@/utils/minute-of-day';

export type NormalizedStoreOperatingHours = {
  closeMinutes: number;
  openMinutes: number;
};

export type StoreOpenStatusKind = 'open' | 'closed' | 'unknown';

export type StoreOpenStatusPresentation = {
  badgeText: string | null;
  detailMinutes: number | null;
  isOpen: boolean;
  kind: StoreOpenStatusKind;
  statusLabel: string;
  valueColor: 'closed' | 'muted' | 'open';
};

export function normalizeStoreOperatingHours(
  store: Store,
): NormalizedStoreOperatingHours | null {
  const hours = store.operatingHours;

  if (!hours) {
    return null;
  }

  if (
    !isValidMinuteOfDay(hours.openMinutes) ||
    !isValidMinuteOfDay(hours.closeMinutes)
  ) {
    return null;
  }

  return {
    openMinutes: hours.openMinutes,
    closeMinutes: hours.closeMinutes,
  };
}

export function buildStoreOpenStatusPresentation(input: {
  hours: NormalizedStoreOperatingHours | null;
  locale?: string | string[];
  nowMinuteOfDay?: number;
}): StoreOpenStatusPresentation {
  const nowMinute = input.nowMinuteOfDay ?? getLocalMinuteOfDay();

  if (!input.hours) {
    return {
      kind: 'unknown',
      isOpen: false,
      statusLabel: 'Unknown',
      badgeText: 'Hours unavailable',
      detailMinutes: null,
      valueColor: 'muted',
    };
  }

  const { openMinutes, closeMinutes } = input.hours;
  const isOpen = isOpenAtMinuteOfDay(nowMinute, openMinutes, closeMinutes);

  if (isOpen) {
    return {
      kind: 'open',
      isOpen: true,
      statusLabel: 'Open',
      badgeText: `Closes ${formatMinutesOfDayForDisplay(closeMinutes, input.locale)}`,
      detailMinutes: closeMinutes,
      valueColor: 'open',
    };
  }

  return {
    kind: 'closed',
    isOpen: false,
    statusLabel: 'Closed',
    badgeText: `Closed at ${formatMinutesOfDayForDisplay(closeMinutes, input.locale)}`,
    detailMinutes: closeMinutes,
    valueColor: 'closed',
  };
}
