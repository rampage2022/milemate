export const ROUTE_PROGRESS_SEGMENT_THRESHOLD = 10;

export type RouteProgressSegmentState = 'completed' | 'current' | 'upcoming';

export function resolveRouteProgressSegmentState(input: {
  completedStops: number;
  currentStopIndex: number | null;
  index: number;
}): RouteProgressSegmentState {
  const { completedStops, currentStopIndex, index } = input;

  if (currentStopIndex === null) {
    return 'completed';
  }

  if (index < completedStops) {
    return 'completed';
  }

  if (index === currentStopIndex) {
    return 'current';
  }

  return 'upcoming';
}
