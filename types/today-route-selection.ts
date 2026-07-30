import type { RouteEndpoint } from '@/types/route-endpoint';
import { getTodayDateString } from '@/utils/today-date';

export type TodayRouteSelection = {
  dateKey: string;
  startEndpoint: RouteEndpoint | null;
  endEndpoint: RouteEndpoint | null;
  returnToStart: boolean;
  updatedAt: string;
};

export function createEmptyTodayRouteSelection(
  dateKey: string = getTodayDateString(),
): TodayRouteSelection {
  return {
    dateKey,
    startEndpoint: null,
    endEndpoint: null,
    returnToStart: true,
    updatedAt: new Date().toISOString(),
  };
}
