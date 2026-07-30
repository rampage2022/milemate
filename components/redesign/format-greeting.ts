export function getTimeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Good Morning';
  }

  if (hour < 17) {
    return 'Good Afternoon';
  }

  return 'Good Evening';
}

export function formatPersonalizedGreeting(displayName?: string | null): string {
  const base = getTimeOfDayGreeting();

  const trimmed = displayName?.trim();

  if (!trimmed) {
    return base;
  }

  return `${base}, ${trimmed}`;
}
