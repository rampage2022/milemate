import type { RouteEndpoint } from '@/types/route-endpoint';
import {
  createEmptyTodayRouteSelection,
  type TodayRouteSelection,
} from '@/types/today-route-selection';
import { getTodayDateString } from '@/utils/today-date';
import { sanitizeRouteEndpoint } from '@/utils/route-endpoints';

export function sanitizeTodayRouteSelection(
  value: unknown,
  todayDateKey: string = getTodayDateString(),
): TodayRouteSelection {
  if (typeof value !== 'object' || value === null) {
    return createEmptyTodayRouteSelection(todayDateKey);
  }

  const record = value as Record<string, unknown>;
  const dateKey =
    typeof record.dateKey === 'string' && record.dateKey.trim().length > 0
      ? record.dateKey.trim()
      : typeof record.scheduledDate === 'string' && record.scheduledDate.trim().length > 0
        ? record.scheduledDate.trim()
        : todayDateKey;

  if (dateKey !== todayDateKey) {
    return createEmptyTodayRouteSelection(todayDateKey);
  }

  const startEndpoint = sanitizeRouteEndpoint(
    record.startEndpoint ?? record.startLocation ?? null,
  );
  const endEndpoint = sanitizeRouteEndpoint(
    record.endEndpoint ?? record.endLocation ?? null,
  );
  const returnToStart =
    record.returnToStart === true || record.returnToStart === false
      ? record.returnToStart
      : record.startAndEndSameLocation === true
        ? true
        : record.startAndEndSameLocation === false
          ? false
          : true;
  const updatedAt =
    typeof record.updatedAt === 'string'
      ? record.updatedAt
      : new Date().toISOString();

  return {
    dateKey,
    startEndpoint,
    endEndpoint,
    returnToStart,
    updatedAt,
  };
}

export function applyReturnToStartToggle(
  selection: TodayRouteSelection,
  returnToStart: boolean,
): TodayRouteSelection {
  return {
    ...selection,
    returnToStart,
    updatedAt: new Date().toISOString(),
  };
}

export function updateTodayRouteStart(
  selection: TodayRouteSelection,
  startEndpoint: RouteEndpoint | null,
): TodayRouteSelection {
  return {
    ...selection,
    startEndpoint,
    updatedAt: new Date().toISOString(),
  };
}

export function updateTodayRouteEnd(
  selection: TodayRouteSelection,
  endEndpoint: RouteEndpoint | null,
): TodayRouteSelection {
  return {
    ...selection,
    endEndpoint,
    updatedAt: new Date().toISOString(),
  };
}

export function replaceCustomEndpointWithSavedReference(
  selection: TodayRouteSelection,
  role: 'start' | 'end',
  savedLocationId: string,
): TodayRouteSelection {
  const endpoint = {
    type: 'saved_location' as const,
    savedLocationId,
  };

  if (role === 'start') {
    return updateTodayRouteStart(selection, endpoint);
  }

  return updateTodayRouteEnd(selection, endpoint);
}
