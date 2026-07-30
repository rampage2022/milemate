import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { buildAutoCheckInConfirmationKey } from '@/utils/auto-check-in-confirmation';
import { buildCheckInNotificationAccessibilityLabel } from '@/utils/check-in-notification-payload';

let handlerConfigured = false;

function configureForegroundPresentation(): void {
  if (handlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  handlerConfigured = true;
}

export async function ensureCheckInNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  configureForegroundPresentation();

  const existing = await Notifications.getPermissionsAsync();

  if (existing.status === 'granted') {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: false,
    },
  });

  return requested.status === 'granted';
}

export type PresentAutomaticCheckInNotificationInput = {
  checkedInAt: number;
  stopId: string;
  storeId: string;
  storeName: string;
  workdayId: string;
};

export async function presentAutomaticCheckInNotification(
  input: PresentAutomaticCheckInNotificationInput,
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  configureForegroundPresentation();

  const granted = await ensureCheckInNotificationPermissions();

  if (!granted) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[CheckInNotification] permission not granted — skipped');
    }

    return;
  }

  const identifier = `check-in-${buildAutoCheckInConfirmationKey(
    input.stopId,
    input.checkedInAt,
  )}`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Checked In',
        body: input.storeName,
        data: {
          notificationType: 'check-in',
          workdayId: input.workdayId,
          stopId: input.stopId,
          storeId: input.storeId,
        },
        ...(Platform.OS === 'ios'
          ? {
              subtitle: input.storeName,
            }
          : null),
      },
      trigger: null,
    });

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[CheckInNotification] scheduled', {
        identifier,
        storeId: input.storeId,
        accessibility: buildCheckInNotificationAccessibilityLabel(input.storeName),
      });
    }
  } catch (error) {
    console.error('[CheckInNotification] schedule failed:', error);
  }
}

export function readCheckInNotificationResponse(
  response: Notifications.NotificationResponse | null,
): Record<string, unknown> | null {
  if (!response) {
    return null;
  }

  const data = response.notification.request.content.data;

  if (!data || typeof data !== 'object') {
    return null;
  }

  return data as Record<string, unknown>;
}

export { Notifications };
