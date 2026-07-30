import { getEffectiveEndLocation } from '@/services/route-planning';
import type { RoutePlanningDraft } from '@/types/route-planning';

export function describeRoutePlanningBlocker(input: {
  draft: RoutePlanningDraft;
  totalStopCount: number;
  verifiedStopCount: number;
}): string | null {
  if (input.totalStopCount < 1) {
    return null;
  }

  if (!input.draft.startLocation) {
    return 'Set a start location in Route to enable Set Route.';
  }

  if (!getEffectiveEndLocation(input.draft)) {
    return 'Set an end location in Route to enable Set Route.';
  }

  if (input.verifiedStopCount < input.totalStopCount) {
    const missing = input.totalStopCount - input.verifiedStopCount;

    return `${missing} stop${missing === 1 ? '' : 's'} still need verified addresses.`;
  }

  return null;
}
