import AsyncStorage from '@react-native-async-storage/async-storage';

import { getRouteEndpointPreferences } from '@/services/route-endpoint-preferences';
import type { RouteEndpoint } from '@/types/route-endpoint';
import {
  createEmptyTodayRouteSelection,
  type TodayRouteSelection,
} from '@/types/today-route-selection';
import {
  applyReturnToStartToggle,
  sanitizeTodayRouteSelection,
  updateTodayRouteEnd,
  updateTodayRouteStart,
} from '@/utils/today-route-selection';
import { serializeRouteEndpointForStorage } from '@/utils/route-endpoints';
import { getTodayDateString } from '@/utils/today-date';

export const TODAY_ROUTE_SELECTION_KEY = '@milemate/today-route-selection';
const LEGACY_TODAY_ROUTE_SETUP_KEY = '@milemate/today-route-setup';

function serializeTodayRouteSelection(
  selection: TodayRouteSelection,
): TodayRouteSelection {
  return {
    dateKey: selection.dateKey,
    startEndpoint:
      selection.startEndpoint === null
        ? null
        : serializeRouteEndpointForStorage(selection.startEndpoint),
    endEndpoint:
      selection.endEndpoint === null
        ? null
        : serializeRouteEndpointForStorage(selection.endEndpoint),
    returnToStart: selection.returnToStart,
    updatedAt: selection.updatedAt,
  };
}

async function migrateLegacyRouteSetup(
  dateKey: string,
): Promise<TodayRouteSelection | null> {
  const stored = await AsyncStorage.getItem(LEGACY_TODAY_ROUTE_SETUP_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    const selection = sanitizeTodayRouteSelection(parsed, dateKey);

    if (selection.dateKey === dateKey) {
      return selection;
    }
  } catch {
    return null;
  }

  return null;
}

async function migrateLegacyRoutePreferences(
  dateKey: string,
): Promise<TodayRouteSelection | null> {
  const legacy = await getRouteEndpointPreferences();
  const hasLegacyStart = legacy.startLocation !== null;
  const hasLegacyEnd = legacy.endLocation !== null;

  if (!hasLegacyStart && !hasLegacyEnd) {
    return null;
  }

  return sanitizeTodayRouteSelection(
    {
      dateKey,
      startEndpoint: legacy.startLocation,
      endEndpoint: legacy.endLocation,
      returnToStart: legacy.startAndEndSameLocation,
      updatedAt: new Date().toISOString(),
    },
    dateKey,
  );
}

export async function getTodayRouteSelection(
  dateKey: string = getTodayDateString(),
): Promise<TodayRouteSelection> {
  const stored = await AsyncStorage.getItem(TODAY_ROUTE_SELECTION_KEY);

  if (stored) {
    try {
      const parsed: unknown = JSON.parse(stored);
      const selection = sanitizeTodayRouteSelection(parsed, dateKey);

      if (selection.dateKey === dateKey) {
        return selection;
      }
    } catch {
      // fall through to migration / empty selection
    }
  }

  const migratedSetup = await migrateLegacyRouteSetup(dateKey);

  if (migratedSetup) {
    await setTodayRouteSelection(migratedSetup);
    return migratedSetup;
  }

  const migratedPreferences = await migrateLegacyRoutePreferences(dateKey);

  if (migratedPreferences) {
    await setTodayRouteSelection(migratedPreferences);
    return migratedPreferences;
  }

  return createEmptyTodayRouteSelection(dateKey);
}

export async function setTodayRouteSelection(
  selection: TodayRouteSelection,
): Promise<void> {
  const dateKey = selection.dateKey || getTodayDateString();
  const sanitized = serializeTodayRouteSelection({
    ...selection,
    dateKey,
    updatedAt: new Date().toISOString(),
  });

  await AsyncStorage.setItem(TODAY_ROUTE_SELECTION_KEY, JSON.stringify(sanitized));
}

export async function updateTodayRouteEndpoint(input: {
  role: 'start' | 'end';
  endpoint: RouteEndpoint | null;
}): Promise<TodayRouteSelection> {
  const current = await getTodayRouteSelection();
  const next =
    input.role === 'start'
      ? updateTodayRouteStart(current, input.endpoint)
      : updateTodayRouteEnd(current, input.endpoint);

  await setTodayRouteSelection(next);

  return next;
}

export async function updateTodayRouteReturnToStart(
  returnToStart: boolean,
): Promise<TodayRouteSelection> {
  const current = await getTodayRouteSelection();
  const next = applyReturnToStartToggle(current, returnToStart);

  await setTodayRouteSelection(next);

  return next;
}
