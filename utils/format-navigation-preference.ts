import { Platform } from 'react-native';

import type { AfterCompletionMode } from '@/types/after-completion';
import { AfterCompletionLabels } from '@/types/after-completion';

/** User-facing navigation preference label (no new persistence). */
export function formatNavigationPreferenceLabel(mode: AfterCompletionMode): string {
  if (mode === 'open_directions') {
    return Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps';
  }

  if (mode === 'ask') {
    return 'Ask';
  }

  return AfterCompletionLabels[mode];
}
