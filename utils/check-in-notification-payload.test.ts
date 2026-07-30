/**
 * Run with: npx tsx utils/check-in-notification-payload.test.ts
 */

import assert from 'node:assert/strict';

import {
  buildCheckInNotificationAccessibilityLabel,
  parseCheckInNotificationPayload,
} from '@/utils/check-in-notification-payload';

assert.deepEqual(
  parseCheckInNotificationPayload({
    notificationType: 'check-in',
    workdayId: 'trip-1',
    stopId: 'visit-1',
    storeId: 'store-1',
  }),
  {
    notificationType: 'check-in',
    workdayId: 'trip-1',
    stopId: 'visit-1',
    storeId: 'store-1',
  },
);

assert.equal(parseCheckInNotificationPayload(undefined), null);
assert.equal(parseCheckInNotificationPayload({ notificationType: 'other' }), null);

assert.equal(
  buildCheckInNotificationAccessibilityLabel('Tom Thumb #1842'),
  'Checked In. Tom Thumb Number 1842.',
);

console.log('check-in-notification-payload.test.ts: ok');
