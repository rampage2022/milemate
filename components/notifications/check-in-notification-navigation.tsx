import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import {
  Notifications,
  readCheckInNotificationResponse,
} from '@/services/check-in-local-notification';
import { parseCheckInNotificationPayload } from '@/utils/check-in-notification-payload';
import { resolveCheckInNotificationDestination } from '@/utils/check-in-notification-navigation';

/** Routes notification taps into the active store visit (or safe fallback). */
export function CheckInNotificationNavigation() {
  const router = useRouter();
  const { isRestoring } = useWorkdayTrackerContext();
  const pendingPayloadRef = useRef<ReturnType<typeof parseCheckInNotificationPayload>>(null);
  const isNavigatingRef = useRef(false);

  const navigateForPayload = useCallback(
    async (payload: NonNullable<ReturnType<typeof parseCheckInNotificationPayload>>) => {
      if (isNavigatingRef.current) {
        return;
      }

      isNavigatingRef.current = true;

      try {
        const destination = await resolveCheckInNotificationDestination(payload);

        if (destination.type === 'store') {
          router.push(`/store/${destination.storeId}`);
          return;
        }

        router.navigate('/' as const);
      } catch (error) {
        console.error('[CheckInNotification] navigation failed:', error);
        router.navigate('/' as const);
      } finally {
        isNavigatingRef.current = false;
      }
    },
    [router],
  );

  const queueOrNavigate = useCallback(
    (payload: NonNullable<ReturnType<typeof parseCheckInNotificationPayload>>) => {
      if (isRestoring) {
        pendingPayloadRef.current = payload;
        return;
      }

      void navigateForPayload(payload);
    },
    [isRestoring, navigateForPayload],
  );

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      const raw = readCheckInNotificationResponse(response);
      const payload = parseCheckInNotificationPayload(raw ?? undefined);

      if (!payload) {
        return;
      }

      queueOrNavigate(payload);
    },
    [queueOrNavigate],
  );

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handleNotificationResponse(response);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      subscription.remove();
    };
  }, [handleNotificationResponse]);

  useEffect(() => {
    if (isRestoring || !pendingPayloadRef.current) {
      return;
    }

    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = null;
    void navigateForPayload(payload);
  }, [isRestoring, navigateForPayload]);

  return null;
}
