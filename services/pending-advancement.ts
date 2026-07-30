import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AfterCompletionMode } from '@/types/after-completion';
import type { VisitAdvancementSnapshot } from '@/types/store-visit';
import { getTodayDateString } from '@/utils/today-date';

export const PENDING_ADVANCEMENT_KEY = '@milemate/pending-visit-advancement';

export type PendingVisitAdvancement = {
  scheduledDate: string;
  completedVisitId: string;
  completedStoreId: string;
  completedStoreName: string;
  nextVisitId: string;
  nextStoreId: string;
  nextStoreName: string;
  afterCompletionMode: AfterCompletionMode;
  snapshot: VisitAdvancementSnapshot;
};

function isSnapshot(value: unknown): value is VisitAdvancementSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.completedVisitId === 'string' &&
    typeof record.completedVisitState === 'object' &&
    record.completedVisitState !== null &&
    (record.promotedVisitId === null ||
      typeof record.promotedVisitId === 'string')
  );
}

function isPendingAdvancement(value: unknown): value is PendingVisitAdvancement {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.scheduledDate === 'string' &&
    typeof record.completedVisitId === 'string' &&
    typeof record.completedStoreId === 'string' &&
    typeof record.completedStoreName === 'string' &&
    typeof record.nextVisitId === 'string' &&
    typeof record.nextStoreId === 'string' &&
    typeof record.nextStoreName === 'string' &&
    (record.afterCompletionMode === 'open_directions' ||
      record.afterCompletionMode === 'ask' ||
      record.afterCompletionMode === 'stay_in_app') &&
    isSnapshot(record.snapshot)
  );
}

export async function getPendingVisitAdvancement(): Promise<PendingVisitAdvancement | null> {
  const stored = await AsyncStorage.getItem(PENDING_ADVANCEMENT_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!isPendingAdvancement(parsed)) {
      return null;
    }

    if (parsed.scheduledDate !== getTodayDateString()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function savePendingVisitAdvancement(
  pending: PendingVisitAdvancement,
): Promise<void> {
  await AsyncStorage.setItem(PENDING_ADVANCEMENT_KEY, JSON.stringify(pending));
}

export async function clearPendingVisitAdvancement(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_ADVANCEMENT_KEY);
}
