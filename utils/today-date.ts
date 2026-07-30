export function getTodayDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatTodayHeading(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Compact planning header date, e.g. "Saturday • Jul 18". */
export function formatCompactTodayDate(date = new Date()): string {
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const monthDay = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return `${weekday} • ${monthDay}`;
}

export function formatPlanningHeaderDateParts(date = new Date()): {
  monthDay: string;
  weekday: string;
} {
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
    monthDay: date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
  };
}
