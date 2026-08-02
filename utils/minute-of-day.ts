export const MINUTES_PER_DAY = 24 * 60;

export function getLocalMinuteOfDay(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isValidMinuteOfDay(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

/** True when `minute` is in [start, end) on the same local calendar day segment. */
export function isMinuteInSameDayRange(
  minute: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  return minute >= startMinutes && minute < endMinutes;
}

/**
 * Open when within daily hours. Supports overnight windows (e.g. 22:00–06:00).
 * Closing minute is exclusive — at exactly close, the store is closed.
 */
export function isOpenAtMinuteOfDay(
  minute: number,
  openMinutes: number,
  closeMinutes: number,
): boolean {
  if (openMinutes === closeMinutes) {
    return false;
  }

  if (closeMinutes > openMinutes) {
    return isMinuteInSameDayRange(minute, openMinutes, closeMinutes);
  }

  return minute >= openMinutes || minute < closeMinutes;
}
