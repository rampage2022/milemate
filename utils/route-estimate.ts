import type { RouteEstimateStatus } from '@/types/route-estimate';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import { isRouteSelectionComplete } from '@/utils/route-endpoints';

export function deriveRouteEstimateStatus(
  selection: TodayRouteSelection,
  locations: SavedLocation[],
): RouteEstimateStatus {
  if (!isRouteSelectionComplete(selection, locations)) {
    return { status: 'incomplete' };
  }

  return { status: 'ready' };
}
