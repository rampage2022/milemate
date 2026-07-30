import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTodayDateString } from '@/utils/today-date';

const ROUTE_STARTED_KEY = '@milemate/route-started-at';
const ROUTE_COMPLETED_KEY = '@milemate/route-completed-at';

type RouteSessionTimingRecord = {
  dateKey: string;
  timestampMs: number;
  /** Miles on the active workday trip when the route was marked complete (optional). */
  distanceMilesAtCompletion?: number;
};

async function readRouteSessionTimingRecord(
  key: string,
): Promise<RouteSessionTimingRecord | null> {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RouteSessionTimingRecord;

    if (
      typeof parsed.dateKey === 'string' &&
      typeof parsed.timestampMs === 'number'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

async function writeRouteSessionTimingRecord(
  key: string,
  record: RouteSessionTimingRecord,
): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(record));
}

async function readDatedTimestamp(key: string): Promise<RouteSessionTimingRecord | null> {
  return readRouteSessionTimingRecord(key);
}

async function writeDatedTimestamp(key: string, timestampMs: number): Promise<void> {
  const payload: RouteSessionTimingRecord = {
    dateKey: getTodayDateString(),
    timestampMs,
  };

  await writeRouteSessionTimingRecord(key, payload);
}

export async function markRouteStartedAt(timestampMs: number = Date.now()): Promise<void> {
  await writeDatedTimestamp(ROUTE_STARTED_KEY, timestampMs);
}

export async function getRouteStartedAtForToday(): Promise<number | null> {
  const entry = await readDatedTimestamp(ROUTE_STARTED_KEY);

  if (!entry || entry.dateKey !== getTodayDateString()) {
    return null;
  }

  return entry.timestampMs;
}

export async function recordRouteCompletedAt(
  timestampMs: number = Date.now(),
  options?: { distanceMilesAtCompletion?: number },
): Promise<number> {
  const payload: RouteSessionTimingRecord = {
    dateKey: getTodayDateString(),
    timestampMs,
  };

  if (
    typeof options?.distanceMilesAtCompletion === 'number' &&
    Number.isFinite(options.distanceMilesAtCompletion) &&
    options.distanceMilesAtCompletion >= 0
  ) {
    payload.distanceMilesAtCompletion = options.distanceMilesAtCompletion;
  }

  await writeRouteSessionTimingRecord(ROUTE_COMPLETED_KEY, payload);

  return timestampMs;
}

export async function getRouteCompletedRecordForToday(): Promise<RouteSessionTimingRecord | null> {
  const entry = await readRouteSessionTimingRecord(ROUTE_COMPLETED_KEY);

  if (!entry || entry.dateKey !== getTodayDateString()) {
    return null;
  }

  return entry;
}

export async function getRouteCompletedAtForToday(): Promise<number | null> {
  const entry = await getRouteCompletedRecordForToday();

  return entry?.timestampMs ?? null;
}

export async function clearRouteSessionTimingForToday(): Promise<void> {
  const dateKey = getTodayDateString();
  const started = await readDatedTimestamp(ROUTE_STARTED_KEY);
  const completed = await readDatedTimestamp(ROUTE_COMPLETED_KEY);

  if (started?.dateKey === dateKey) {
    await AsyncStorage.removeItem(ROUTE_STARTED_KEY);
  }

  if (completed?.dateKey === dateKey) {
    await AsyncStorage.removeItem(ROUTE_COMPLETED_KEY);
  }
}
