import type { Store } from '@/types/store';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import type { StoreVisit } from '@/types/store-visit';
import { indexSavedLocationsById } from '@/utils/my-locations';
import {
  buildBriefingRouteSummaryFromSelection,
  getEffectiveEndEndpoint,
  isRouteSelectionComplete,
  resolveEndpointForDisplay,
  type BriefingRouteSummary,
} from '@/utils/route-endpoints';

export type BriefingFirstStop = {
  storeId: string;
  storeName: string;
  routeOrder: number;
};

export type AdaptiveRouteBriefing = {
  startLabel: string | null;
  endLabel: string | null;
  routeSummary: BriefingRouteSummary | null;
  firstStop: BriefingFirstStop | null;
  isRouteComplete: boolean;
};

export function resolveFirstStop(
  visits: StoreVisit[],
  storesById: Record<string, Store>,
): BriefingFirstStop | null {
  const sorted = [...visits].sort((left, right) => left.routeOrder - right.routeOrder);
  const firstActive = sorted.find(
    (visit) =>
      visit.status === 'pending' ||
      visit.status === 'current' ||
      visit.status === 'checked_in',
  );

  if (!firstActive) {
    return null;
  }

  const store = storesById[firstActive.storeId];

  return {
    storeId: firstActive.storeId,
    storeName: store?.name ?? 'First stop',
    routeOrder: firstActive.routeOrder,
  };
}

export function buildAdaptiveRouteBriefing(input: {
  selection: TodayRouteSelection;
  locations: SavedLocation[];
  stopCount: number;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): AdaptiveRouteBriefing {
  const locationsById = indexSavedLocationsById(input.locations);
  const isRouteComplete = isRouteSelectionComplete(input.selection, input.locations);
  const startDisplay = resolveEndpointForDisplay(
    input.selection.startEndpoint,
    locationsById,
  );
  const endDisplay = resolveEndpointForDisplay(
    getEffectiveEndEndpoint(input.selection),
    locationsById,
  );

  return {
    startLabel: startDisplay?.isResolved ? startDisplay.label : null,
    endLabel: endDisplay?.isResolved ? endDisplay.label : null,
    routeSummary: isRouteComplete
      ? buildBriefingRouteSummaryFromSelection(input.selection, input.locations)
      : null,
    firstStop: resolveFirstStop(input.visits, input.storesById),
    isRouteComplete,
  };
}
