export type AutoCheckInMode = 'automatic' | 'ask' | 'manual';

export const AUTO_CHECK_IN_MODE_LABELS: Record<AutoCheckInMode, string> = {
  automatic: 'Automatic',
  ask: 'Ask Every Time',
  manual: 'Manual',
};

export const DEFAULT_AUTO_CHECK_IN_MODE: AutoCheckInMode = 'ask';

export function isAutoCheckInMode(value: unknown): value is AutoCheckInMode {
  return value === 'automatic' || value === 'ask' || value === 'manual';
}

export function cycleAutoCheckInMode(current: AutoCheckInMode): AutoCheckInMode {
  const order: AutoCheckInMode[] = ['automatic', 'ask', 'manual'];
  const index = order.indexOf(current);

  return order[(index + 1) % order.length];
}
