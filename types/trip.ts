import type { ActiveWorkdayRouteContext } from '@/types/active-workday-route';

export type Trip = {
  id: string;
  startedAt: number;
  endedAt?: number;
  distanceMiles: number;
  routeContext?: ActiveWorkdayRouteContext;
};

export function isCompletedTrip(trip: Trip): boolean {
  return trip.endedAt !== undefined;
}
