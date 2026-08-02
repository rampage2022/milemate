import {
  diffLocalCalendarDays,
  startOfLocalCalendarDay,
} from '@/utils/local-calendar-date';

export const STORE_DELIVERY_NEW_ENTRY_PAST_DAYS = 14;

export type StoreDeliveryNewEntryAction =
  | { kind: 'create_scheduled' }
  | { kind: 'prompt_outcome' }
  | { kind: 'reject_too_old' };

/**
 * Local calendar days from selected → reference (positive when selected is earlier).
 */
export function calendarDaysSelectedBeforeReference(
  selectedDate: Date,
  reference: Date,
): number {
  return diffLocalCalendarDays(
    startOfLocalCalendarDay(selectedDate),
    startOfLocalCalendarDay(reference),
  );
}

export function resolveStoreDeliveryNewEntryAction(input: {
  pastDays?: number;
  reference?: Date;
  selectedDate: Date;
}): StoreDeliveryNewEntryAction {
  const reference = startOfLocalCalendarDay(input.reference ?? new Date());
  const selected = startOfLocalCalendarDay(input.selectedDate);
  const pastDays = input.pastDays ?? STORE_DELIVERY_NEW_ENTRY_PAST_DAYS;
  const daysBeforeReference = calendarDaysSelectedBeforeReference(selected, reference);

  if (daysBeforeReference <= 0) {
    return { kind: 'create_scheduled' };
  }

  if (daysBeforeReference > pastDays) {
    return { kind: 'reject_too_old' };
  }

  return { kind: 'prompt_outcome' };
}
