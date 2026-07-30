export type CheckInNotificationPayload = {
  notificationType: 'check-in';
  stopId: string;
  storeId: string;
  workdayId: string;
};

export function parseCheckInNotificationPayload(
  data: Record<string, unknown> | undefined,
): CheckInNotificationPayload | null {
  if (!data || data.notificationType !== 'check-in') {
    return null;
  }

  if (typeof data.stopId !== 'string' || data.stopId.length === 0) {
    return null;
  }

  if (typeof data.storeId !== 'string' || data.storeId.length === 0) {
    return null;
  }

  if (typeof data.workdayId !== 'string' || data.workdayId.length === 0) {
    return null;
  }

  return {
    notificationType: 'check-in',
    stopId: data.stopId,
    storeId: data.storeId,
    workdayId: data.workdayId,
  };
}

export function buildCheckInNotificationAccessibilityLabel(storeName: string): string {
  const normalized = storeName.replace(/#/g, ' Number ').replace(/\s+/g, ' ').trim();

  return `Checked In. ${normalized}.`;
}
