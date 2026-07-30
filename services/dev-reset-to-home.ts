import { reset } from '@/core/workdayCoordinator';
import { clearActiveTrip } from '@/services/active-trip';
import { clearPendingVisitAdvancement } from '@/services/pending-advancement';
import { clearTodayRouteStops } from '@/services/route-calculation';
import { resetRoutePlanningToPlanningPhase } from '@/services/route-planning';
import { clearRouteSessionTimingForToday } from '@/services/route-session-timing';
import { onWorkdayEndedSuccess } from '@/services/workday-coordinator-integration';

/** Dev-only persistence reset so Home can return to the idle launcher. */
export async function devResetToHomePersistence(): Promise<void> {
  await clearTodayRouteStops();
  await clearRouteSessionTimingForToday();
  await clearPendingVisitAdvancement();
  await resetRoutePlanningToPlanningPhase();
  await clearActiveTrip();
  reset();
  onWorkdayEndedSuccess();
}
