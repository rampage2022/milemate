export type AfterCompletionMode =
  | 'open_directions'
  | 'ask'
  | 'stay_in_app';

export const AFTER_COMPLETION_MODES: AfterCompletionMode[] = [
  'open_directions',
  'ask',
  'stay_in_app',
];

export const AfterCompletionLabels: Record<AfterCompletionMode, string> = {
  open_directions: 'Open Directions',
  ask: 'Ask Me',
  stay_in_app: 'Stay in MileMate',
};

export const AfterCompletionIcons: Record<AfterCompletionMode, string> = {
  open_directions: '🧭',
  ask: '❓',
  stay_in_app: '📍',
};

export function cycleAfterCompletionMode(
  current: AfterCompletionMode,
): AfterCompletionMode {
  const index = AFTER_COMPLETION_MODES.indexOf(current);

  return AFTER_COMPLETION_MODES[(index + 1) % AFTER_COMPLETION_MODES.length];
}

export function getCountdownSubtitle(mode: AfterCompletionMode): string {
  if (mode === 'open_directions') {
    return 'Preparing directions...';
  }

  return 'Preparing next stop...';
}
