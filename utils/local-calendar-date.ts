import { parseStoreOrderDateString } from '@/utils/store-order-presentation';

/** Local calendar midnight for a Date. */
export function startOfLocalCalendarDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/** Move by whole calendar days in local time (handles DST). */
export function addLocalCalendarDays(date: Date, dayCount: number): Date {
  const next = startOfLocalCalendarDay(date);
  next.setDate(next.getDate() + dayCount);
  return next;
}

export function localCalendarDayKey(date: Date): string {
  const normalized = startOfLocalCalendarDay(date);
  const year = normalized.getFullYear();
  const month = `${normalized.getMonth() + 1}`.padStart(2, '0');
  const day = `${normalized.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Whole calendar days from `from` to `to` (exclusive of sign: positive when `to` is later). */
export function diffLocalCalendarDays(from: Date, to: Date): number {
  const start = startOfLocalCalendarDay(from).getTime();
  const end = startOfLocalCalendarDay(to).getTime();
  const msPerDay = 86_400_000;

  return Math.round((end - start) / msPerDay);
}

export function parseStoreOrderExpectedLocalDate(
  expectedDeliveryDate: string,
): Date | null {
  return parseStoreOrderDateString(expectedDeliveryDate);
}

export function isStoreOrderDateAfter(
  expectedDeliveryDate: string,
  reference: Date,
): boolean {
  const expected = parseStoreOrderExpectedLocalDate(expectedDeliveryDate);

  if (!expected) {
    return false;
  }

  return (
    startOfLocalCalendarDay(expected).getTime() >
    startOfLocalCalendarDay(reference).getTime()
  );
}

export function isStoreOrderDateOnOrBefore(
  expectedDeliveryDate: string,
  reference: Date,
): boolean {
  const expected = parseStoreOrderExpectedLocalDate(expectedDeliveryDate);

  if (!expected) {
    return false;
  }

  return (
    startOfLocalCalendarDay(expected).getTime() <=
    startOfLocalCalendarDay(reference).getTime()
  );
}

/** Inclusive window: today back through `pastDays` calendar days. */
export function isStoreOrderDateWithinPastCalendarDaysInclusive(input: {
  expectedDeliveryDate: string;
  pastDays: number;
  reference?: Date;
}): boolean {
  const reference = startOfLocalCalendarDay(input.reference ?? new Date());
  const expected = parseStoreOrderExpectedLocalDate(input.expectedDeliveryDate);

  if (!expected) {
    return false;
  }

  const expectedDay = startOfLocalCalendarDay(expected);
  const daysAgo = diffLocalCalendarDays(expectedDay, reference);

  return daysAgo >= 0 && daysAgo <= input.pastDays;
}

export function isStoreOrderDateBeforePastWindow(input: {
  expectedDeliveryDate: string;
  pastDays: number;
  reference?: Date;
}): boolean {
  const reference = startOfLocalCalendarDay(input.reference ?? new Date());
  const expected = parseStoreOrderExpectedLocalDate(input.expectedDeliveryDate);

  if (!expected) {
    return false;
  }

  const daysAgo = diffLocalCalendarDays(startOfLocalCalendarDay(expected), reference);

  return daysAgo > input.pastDays;
}
