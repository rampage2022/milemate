/**
 * Run with: npx tsx utils/store-delivery-new-entry.test.ts
 */

import assert from 'node:assert/strict';

import { addLocalCalendarDays } from '@/utils/local-calendar-date';
import {
  resolveStoreDeliveryNewEntryAction,
  STORE_DELIVERY_NEW_ENTRY_PAST_DAYS,
} from '@/utils/store-delivery-new-entry';
import {
  isSelectedLocalDateTodayOrFuture,
  isSelectedLocalDateInPast,
} from '@/utils/store-deliveries-queue';

const reference = new Date(2026, 7, 2, 15, 30, 0);

assert.equal(
  resolveStoreDeliveryNewEntryAction({
    reference,
    selectedDate: addLocalCalendarDays(reference, 5),
  }).kind,
  'create_scheduled',
);

assert.equal(
  resolveStoreDeliveryNewEntryAction({
    reference,
    selectedDate: reference,
  }).kind,
  'create_scheduled',
);

assert.equal(
  resolveStoreDeliveryNewEntryAction({
    reference,
    selectedDate: addLocalCalendarDays(reference, -1),
  }).kind,
  'prompt_outcome',
);

assert.equal(
  resolveStoreDeliveryNewEntryAction({
    reference,
    selectedDate: addLocalCalendarDays(reference, -14),
  }).kind,
  'prompt_outcome',
);

assert.equal(
  resolveStoreDeliveryNewEntryAction({
    reference,
    selectedDate: addLocalCalendarDays(reference, -15),
  }).kind,
  'reject_too_old',
);

assert.equal(
  isSelectedLocalDateTodayOrFuture({
    reference,
    selectedDate: addLocalCalendarDays(reference, 3),
  }),
  true,
);

assert.equal(
  isSelectedLocalDateInPast({
    reference,
    selectedDate: addLocalCalendarDays(reference, 3),
  }),
  false,
);

const springForward = new Date(2026, 2, 8, 12, 0, 0);

assert.equal(
  resolveStoreDeliveryNewEntryAction({
    reference: springForward,
    selectedDate: addLocalCalendarDays(springForward, -14),
  }).kind,
  'prompt_outcome',
);

assert.equal(
  resolveStoreDeliveryNewEntryAction({
    reference: springForward,
    selectedDate: addLocalCalendarDays(springForward, -15),
  }).kind,
  'reject_too_old',
);

assert.equal(STORE_DELIVERY_NEW_ENTRY_PAST_DAYS, 14);

console.log('store-delivery-new-entry tests passed');
