import type { StoreVisitStatus } from '@/types/store-visit';

export type CurrentStopPhase =
  | 'not_arrived'
  | 'arrived'
  | 'visit_in_progress';

export function resolveCurrentStopPhase(
  visitStatus: StoreVisitStatus,
  hasArrived: boolean,
): CurrentStopPhase {
  if (visitStatus === 'checked_in') {
    return 'visit_in_progress';
  }

  if (visitStatus === 'current' && hasArrived) {
    return 'arrived';
  }

  return 'not_arrived';
}

export const CurrentStopPhaseLabels: Record<CurrentStopPhase, string> = {
  not_arrived: 'On the way',
  arrived: "You've arrived",
  visit_in_progress: 'Visit in progress',
};
