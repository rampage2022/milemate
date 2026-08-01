import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RouteLocation } from '@/types/route-location';
import {
  sanitizeRouteLocation,
  createRouteLocationId,
} from '@/types/route-location';
import type {
  PlannedRouteEstimate,
  RouteMapCoordinate,
  RoutePlanningDraft,
  RoutePlanningPhase,
} from '@/types/route-planning';
import { getTodayDateString } from '@/utils/today-date';

export const ROUTE_PLANNING_DRAFT_KEY = '@milemate/route-planning-draft';

function createEmptyDraft(dateKey: string = getTodayDateString()): RoutePlanningDraft {
  return {
    dateKey,
    phase: 'planning',
    startLocation: null,
    endLocation: null,
    returnToStart: true,
    estimate: null,
    drivingPolyline: null,
    calculatedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeRoutePlanningDraft(
  value: unknown,
  todayDateKey: string = getTodayDateString(),
): RoutePlanningDraft {
  if (typeof value !== 'object' || value === null) {
    return createEmptyDraft(todayDateKey);
  }

  const record = value as Record<string, unknown>;
  const dateKey =
    typeof record.dateKey === 'string' && record.dateKey.trim().length > 0
      ? record.dateKey.trim()
      : todayDateKey;

  if (dateKey !== todayDateKey) {
    return createEmptyDraft(todayDateKey);
  }

  const phase: RoutePlanningPhase =
    record.phase === 'calculating' ||
    record.phase === 'briefing' ||
    record.phase === 'planning'
      ? record.phase
      : 'planning';

  const startLocation = sanitizeRouteLocation(record.startLocation);
  const endLocation = sanitizeRouteLocation(record.endLocation);
  const estimate =
    typeof record.estimate === 'object' && record.estimate !== null
      ? sanitizeEstimate(record.estimate as Record<string, unknown>)
      : null;
  const drivingPolyline = sanitizeDrivingPolyline(record.drivingPolyline);

  return {
    dateKey,
    phase,
    startLocation,
    endLocation,
    returnToStart: record.returnToStart === false ? false : true,
    estimate,
    drivingPolyline,
    calculatedAt:
      typeof record.calculatedAt === 'string' ? record.calculatedAt : null,
    updatedAt:
      typeof record.updatedAt === 'string'
        ? record.updatedAt
        : new Date().toISOString(),
  };
}

function sanitizeEstimate(value: Record<string, unknown>): PlannedRouteEstimate | null {
  if (
    typeof value.distanceMiles !== 'number' ||
    typeof value.driveTimeMinutes !== 'number' ||
    typeof value.estimatedFinishAt !== 'string'
  ) {
    return null;
  }

  const method =
    value.method === 'apple-mapkit-driving' ? 'apple-mapkit-driving' : 'direct-segment-sum';

  return {
    distanceMiles: value.distanceMiles,
    driveTimeMinutes: value.driveTimeMinutes,
    estimatedFinishAt: value.estimatedFinishAt,
    method,
  };
}

function sanitizeDrivingPolyline(value: unknown): RouteMapCoordinate[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const points: RouteMapCoordinate[] = [];

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const record = entry as Record<string, unknown>;

    if (
      typeof record.latitude !== 'number' ||
      typeof record.longitude !== 'number' ||
      !Number.isFinite(record.latitude) ||
      !Number.isFinite(record.longitude)
    ) {
      continue;
    }

    points.push({ latitude: record.latitude, longitude: record.longitude });
  }

  return points.length >= 2 ? points : null;
}

export async function getRoutePlanningDraft(
  dateKey: string = getTodayDateString(),
): Promise<RoutePlanningDraft> {
  const stored = await AsyncStorage.getItem(ROUTE_PLANNING_DRAFT_KEY);

  if (!stored) {
    return createEmptyDraft(dateKey);
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    return sanitizeRoutePlanningDraft(parsed, dateKey);
  } catch {
    return createEmptyDraft(dateKey);
  }
}

export async function setRoutePlanningDraft(
  draft: RoutePlanningDraft,
): Promise<void> {
  const sanitized = sanitizeRoutePlanningDraft({
    ...draft,
    updatedAt: new Date().toISOString(),
  });

  await AsyncStorage.setItem(ROUTE_PLANNING_DRAFT_KEY, JSON.stringify(sanitized));
}

export async function updateRoutePlanningPhase(
  phase: RoutePlanningPhase,
): Promise<RoutePlanningDraft> {
  const current = await getRoutePlanningDraft();
  const next: RoutePlanningDraft = {
    ...current,
    phase,
    updatedAt: new Date().toISOString(),
  };

  await setRoutePlanningDraft(next);

  return next;
}

export async function updateRoutePlanningLocations(input: {
  startLocation?: RouteLocation | null;
  endLocation?: RouteLocation | null;
  returnToStart?: boolean;
}): Promise<RoutePlanningDraft> {
  const current = await getRoutePlanningDraft();
  const next: RoutePlanningDraft = {
    ...current,
    startLocation:
      input.startLocation === undefined
        ? current.startLocation
        : input.startLocation,
    endLocation:
      input.endLocation === undefined ? current.endLocation : input.endLocation,
    returnToStart:
      input.returnToStart === undefined
        ? current.returnToStart
        : input.returnToStart,
    estimate: null,
    drivingPolyline: null,
    calculatedAt: null,
    phase: 'planning',
    updatedAt: new Date().toISOString(),
  };

  await setRoutePlanningDraft(next);

  return next;
}

export async function saveRoutePlanningResult(input: {
  estimate: PlannedRouteEstimate;
  startLocation: RouteLocation;
  endLocation: RouteLocation;
  returnToStart: boolean;
  drivingPolyline?: RouteMapCoordinate[] | null;
}): Promise<RoutePlanningDraft> {
  const next: RoutePlanningDraft = {
    ...(await getRoutePlanningDraft()),
    phase: 'briefing',
    startLocation: input.startLocation,
    endLocation: input.endLocation,
    returnToStart: input.returnToStart,
    estimate: input.estimate,
    drivingPolyline: input.drivingPolyline ?? null,
    calculatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setRoutePlanningDraft(next);

  return next;
}

export async function resetRoutePlanningToPlanningPhase(): Promise<RoutePlanningDraft> {
  const current = await getRoutePlanningDraft();

  const next: RoutePlanningDraft = {
    ...current,
    phase: 'planning',
    estimate: null,
    drivingPolyline: null,
    calculatedAt: null,
    updatedAt: new Date().toISOString(),
  };

  await setRoutePlanningDraft(next);

  return next;
}

export async function invalidateRoutePlanningEstimate(): Promise<RoutePlanningDraft> {
  const current = await getRoutePlanningDraft();

  if (
    current.phase === 'planning' &&
    !current.estimate &&
    !current.calculatedAt &&
    !current.drivingPolyline
  ) {
    return current;
  }

  const next: RoutePlanningDraft = {
    ...current,
    phase: 'planning',
    estimate: null,
    drivingPolyline: null,
    calculatedAt: null,
    updatedAt: new Date().toISOString(),
  };

  await setRoutePlanningDraft(next);

  return next;
}

export async function updateRoutePlanningEstimate(input: {
  drivingPolyline: RouteMapCoordinate[] | null;
  estimate: PlannedRouteEstimate;
}): Promise<RoutePlanningDraft> {
  const current = await getRoutePlanningDraft();
  const next: RoutePlanningDraft = {
    ...current,
    calculatedAt: new Date().toISOString(),
    drivingPolyline: input.drivingPolyline,
    estimate: input.estimate,
    updatedAt: new Date().toISOString(),
  };

  await setRoutePlanningDraft(next);

  return next;
}

export function routeLocationFromSavedProfile(input: {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}): RouteLocation {
  return {
    id: input.id,
    name: input.label,
    formattedAddress: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    source: 'profile',
  };
}

export function routeLocationFromConfirmation(input: {
  name?: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  source: RouteLocation['source'];
}): RouteLocation {
  return {
    id: createRouteLocationId(),
    name: input.name?.trim() || undefined,
    formattedAddress: input.formattedAddress.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    source: input.source,
  };
}

export function getEffectiveEndLocation(draft: RoutePlanningDraft): RouteLocation | null {
  if (draft.returnToStart) {
    return draft.startLocation;
  }

  return draft.endLocation;
}

export function isRoutePlanningReadyToCalculate(
  draft: RoutePlanningDraft,
  input: {
    totalStopCount: number;
    verifiedStopCount: number;
  },
): boolean {
  if (input.totalStopCount < 1) {
    return false;
  }

  if (input.verifiedStopCount < input.totalStopCount) {
    return false;
  }

  if (!draft.startLocation) {
    return false;
  }

  const end = getEffectiveEndLocation(draft);

  return end !== null;
}
