import type { ActiveWorkdayRouteContext } from '@/types/active-workday-route';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { Trip } from '@/types/trip';

/** Resolved map endpoint from persisted workday / route selection data. */
export type RouteCompleteMapEndpoint = {
  label: string;
  latitude: number;
  longitude: number;
};

/**
 * Read-only snapshot assembled from persisted workday, visit, route, and order
 * storage at route-complete time. The finish screen must not maintain a parallel model.
 */
export type RouteCompleteRecord = {
  /** Active workday trip when route ended (may include routeContext snapshot). */
  activeWorkdayTrip: Trip | null;
  distanceMiles: number | null;
  endEndpoint: RouteCompleteMapEndpoint | null;
  mileageTrackingAvailable: boolean;
  ordersLoggedCount: number;
  returnToStart: boolean;
  routeCompletedAtMs: number;
  routeContext: ActiveWorkdayRouteContext | null;
  routeStartedAtMs: number | null;
  startEndpoint: RouteCompleteMapEndpoint | null;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
  workdayStartedAtMs: number | null;
};
