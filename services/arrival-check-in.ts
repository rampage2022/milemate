import { checkInVisit } from '@/services/store-visits';
import type { StoreVisit } from '@/types/store-visit';

export const AUTOMATIC_CHECK_IN_UNDO_MS = 5_000;

const processingLocks = new Set<string>();
const handledAutomaticCheckInVisitIds = new Set<string>();

export function resetAutomaticCheckInSessionState(): void {
  processingLocks.clear();
  handledAutomaticCheckInVisitIds.clear();
}

export function hasAutomaticCheckInBeenHandled(visitId: string): boolean {
  return handledAutomaticCheckInVisitIds.has(visitId);
}

export function markAutomaticCheckInHandled(visitId: string): void {
  handledAutomaticCheckInVisitIds.add(visitId);
}

export function clearAutomaticCheckInHandled(visitId: string): void {
  handledAutomaticCheckInVisitIds.delete(visitId);
}

export async function performAutomaticCheckIn(
  visitId: string,
): Promise<StoreVisit | null> {
  if (
    processingLocks.has(visitId) ||
    handledAutomaticCheckInVisitIds.has(visitId)
  ) {
    return null;
  }

  processingLocks.add(visitId);

  try {
    const updatedVisit = await checkInVisit(visitId, { source: 'automatic' });

    if (updatedVisit?.checkInSource === 'automatic') {
      handledAutomaticCheckInVisitIds.add(visitId);
    }

    return updatedVisit;
  } finally {
    processingLocks.delete(visitId);
  }
}

export async function performUndoAutomaticCheckIn(
  visitId: string,
): Promise<StoreVisit | null> {
  const { undoActiveCheckIn } = await import('@/services/store-visits');
  const updatedVisit = await undoActiveCheckIn(visitId);

  if (updatedVisit) {
    handledAutomaticCheckInVisitIds.delete(visitId);
  }

  return updatedVisit;
}

export function logArrivalDevEvent(message: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[arrival] ${message}`);
  }
}

/** @internal Resets in-memory locks between tests. */
export function __resetArrivalCheckInForTests(): void {
  resetAutomaticCheckInSessionState();
}
