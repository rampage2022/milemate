import { getActiveTrip, saveActiveTrip } from '@/services/active-trip';
import { getMyLocations } from '@/services/my-locations';
import { getTodayRouteSelection } from '@/services/today-route-selection';
import { resolveRouteEndpointCoordinates } from '@/services/route-endpoint-resolver';
import type { RouteEndpoint } from '@/types/route-endpoint';
import { buildActiveWorkdayRouteContext } from '@/utils/active-workday-route';
import { isCurrentLocationEndpoint } from '@/utils/route-endpoints';

export type StartDayPrepareResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'permission_denied' | 'location_unavailable';
      message: string;
    };

const START_DAY_PERMISSION_MESSAGE =
  'Location access is required when Start Location is set to Current Location.';
const START_DAY_UNAVAILABLE_MESSAGE =
  'Could not determine your current location. Try again in a moment.';

export async function validateStartEndpointForStartDay(
  startLocation: RouteEndpoint,
): Promise<StartDayPrepareResult> {
  if (!isCurrentLocationEndpoint(startLocation)) {
    return { ok: true };
  }

  const resolution = await resolveRouteEndpointCoordinates(startLocation);

  if (resolution.status === 'permission_denied') {
    return {
      ok: false,
      reason: 'permission_denied',
      message: START_DAY_PERMISSION_MESSAGE,
    };
  }

  if (resolution.status === 'unavailable') {
    return {
      ok: false,
      reason: 'location_unavailable',
      message: START_DAY_UNAVAILABLE_MESSAGE,
    };
  }

  return { ok: true };
}

/**
 * Start Day remains available with an incomplete route. Mileage tracking uses
 * the existing workday start flow and does not require route coordinates.
 */
export async function prepareStartDayLocationRequirements(): Promise<StartDayPrepareResult> {
  return { ok: true };
}

export async function attachWorkdayRouteSnapshotAfterStart(): Promise<void> {
  const activeTrip = await getActiveTrip();

  if (!activeTrip || activeTrip.endedAt !== undefined) {
    return;
  }

  const [selection, locations] = await Promise.all([
    getTodayRouteSelection(),
    getMyLocations(),
  ]);
  const routeContext = buildActiveWorkdayRouteContext(selection, locations);

  await saveActiveTrip({
    ...activeTrip,
    routeContext,
  });
}

export async function resolveEndRouteEndpointForWorkdayClose(): Promise<void> {
  const selection = await getTodayRouteSelection();
  const { getEffectiveEndEndpoint } = await import('@/utils/route-endpoints');
  const endpoint = getEffectiveEndEndpoint(selection);

  if (!endpoint || !isCurrentLocationEndpoint(endpoint)) {
    return;
  }

  await resolveRouteEndpointCoordinates(endpoint);
}
