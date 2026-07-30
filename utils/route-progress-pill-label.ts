export function formatRouteProgressPillLabel(
  completedStops: number,
  totalStops: number,
): string {
  return `${completedStops} / ${totalStops} Complete`;
}
