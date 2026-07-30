import { getActiveTrip } from '@/services/active-trip';
import { getStoreById } from '@/services/stores';
import { getVisitById } from '@/services/store-visits';
import type { CheckInNotificationPayload } from '@/utils/check-in-notification-payload';
import { getTodayDateString } from '@/utils/today-date';

export type CheckInNotificationDestination =
  | { type: 'store'; storeId: string }
  | { type: 'today' };

export async function resolveCheckInNotificationDestination(
  payload: CheckInNotificationPayload,
): Promise<CheckInNotificationDestination> {
  try {
    const [visit, store, activeTrip] = await Promise.all([
      getVisitById(payload.stopId),
      getStoreById(payload.storeId),
      getActiveTrip(),
    ]);

    if (!store) {
      return { type: 'today' };
    }

    if (!visit) {
      if (payload.storeId) {
        return { type: 'store', storeId: payload.storeId };
      }

      return { type: 'today' };
    }

    const visitStoreMatches = visit.storeId === payload.storeId;
    const visitStopMatches = visit.id === payload.stopId;

    if (!visitStoreMatches || !visitStopMatches) {
      return { type: 'store', storeId: payload.storeId };
    }

    const today = getTodayDateString();
    const workdayStillActive = activeTrip !== null && activeTrip.id === payload.workdayId;
    const visitOnToday = visit.scheduledDate === today;

    if (!workdayStillActive) {
      if (visit.status === 'completed' || visit.status === 'skipped') {
        return { type: 'store', storeId: payload.storeId };
      }

      if (!visitOnToday) {
        return { type: 'today' };
      }

      return { type: 'today' };
    }

    return { type: 'store', storeId: payload.storeId };
  } catch (error) {
    console.error('[CheckInNotification] destination resolution failed:', error);

    if (payload.storeId) {
      return { type: 'store', storeId: payload.storeId };
    }

    return { type: 'today' };
  }
}
