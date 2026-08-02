import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildVisitLogPresentation,
  buildVisitLogSheetActions,
  formatVisitLogLastVisitMetadataLine,
  VISIT_LOG_PHOTO_CAPTURE_SUPPORTED,
  visitLogSheetActionIds,
} from '@/utils/visit-log-presentation';
import { buildVisitLogReceivingCallout } from '@/utils/visit-log-receiving-callout';

function createVisit(partial: Partial<StoreVisit> & Pick<StoreVisit, 'id'>): StoreVisit {
  const now = Date.now();

  return {
    storeId: 'store-1',
    scheduledDate: '2026-07-29',
    routeOrder: 1,
    status: 'checked_in',
    notes: [],
    createdAt: now,
    updatedAt: now,
    checkedInAt: now,
    ...partial,
  };
}

function createStore(partial: Partial<Store> = {}): Store {
  const now = Date.now();

  return {
    id: 'store-1',
    name: 'Demo',
    addressLine1: '1 Main',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function runTests() {
  const visit = createVisit({ id: 'visit-1' });
  const storeNoMeta = createStore();

  const emptyPresentation = buildVisitLogPresentation({
    visit,
    store: storeNoMeta,
    pendingOrders: [],
    orderHistory: [],
    lastCompletedVisit: null,
    latestNotReceivedChecksByOrderId: {},
  });

  assert.equal(emptyPresentation.lastVisitMetadataLine, null);
  assert.equal(emptyPresentation.showStoreStatusRow, false);
  assert.equal(emptyPresentation.showManagerRow, false);
  assert.equal(emptyPresentation.showOperationalDivider, false);

  const storeWithHours = createStore({
    operatingHours: { openMinutes: 8 * 60, closeMinutes: 22 * 60 },
  });

  const closedAtNight = buildVisitLogPresentation({
    visit,
    store: storeWithHours,
    pendingOrders: [],
    orderHistory: [],
    lastCompletedVisit: null,
    latestNotReceivedChecksByOrderId: {},
    nowMinuteOfDay: 22 * 60 + 43,
  });

  assert.equal(closedAtNight.showStoreStatusRow, true);
  assert.equal(closedAtNight.storeOpenStatus.kind, 'closed');

  const storeWithReceiving = createStore({
    receivingRestriction: { type: 'before', timeMinutes: 14 * 60 },
  });

  const receivingCallout = buildVisitLogReceivingCallout({
    restriction: { type: 'before', timeMinutes: 14 * 60 },
    nowMinuteOfDay: 13 * 60,
    locale: 'en-US',
  });

  assert.match(receivingCallout.visible ? receivingCallout.label : '', /cutoff ·/);

  void storeWithReceiving;

  const lastVisit = createVisit({
    id: 'visit-old',
    status: 'completed',
    completedAt: new Date('2026-07-29T15:42:00').getTime(),
  });

  const lastLine = formatVisitLogLastVisitMetadataLine(lastVisit);
  assert.match(lastLine ?? '', /^Last visit · Jul 29 at /);

  const activeVisit = createVisit({ id: 'visit-active' });
  const presentation = buildVisitLogPresentation({
    visit: activeVisit,
    store: storeNoMeta,
    pendingOrders: [],
    orderHistory: [],
    lastCompletedVisit: lastVisit,
    latestNotReceivedChecksByOrderId: {},
  });

  assert.ok(presentation.lastVisitMetadataLine);

  const actions = buildVisitLogSheetActions(presentation);
  const ids = visitLogSheetActionIds(actions);

  assert.deepEqual(ids, ['delivery', 'notes', 'photos', 'orders']);
  assert.equal(actions[0]?.title, 'Log Delivery');
  assert.equal(actions[3]?.title, 'Orders');
  assert.ok(!ids.includes('complete-visit' as never));

  const photoAction = actions.find((action) => action.id === 'photos');
  assert.equal(photoAction?.disabled, !VISIT_LOG_PHOTO_CAPTURE_SUPPORTED);
  assert.match(photoAction?.accessibilityLabel ?? '', /coming soon|Photos/i);

  const deliveryAction = actions.find((action) => action.id === 'delivery');
  assert.equal(deliveryAction?.title, 'Log Delivery');

  const notesAction = actions.find((action) => action.id === 'notes');
  assert.equal(notesAction?.title, 'Add Note');

  const deliveredOrder = {
    id: 'order-delivered-today',
    storeId: 'store-1',
    placedAt: '08-02-26',
    expectedDeliveryDate: '08-02-26',
    status: 'delivered' as const,
    deliveredAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const afterDelivery = buildVisitLogPresentation({
    visit,
    store: storeNoMeta,
    pendingOrders: [],
    orderHistory: [deliveredOrder],
    lastCompletedVisit: null,
    latestNotReceivedChecksByOrderId: {},
  });

  assert.equal(afterDelivery.deliveryActionSecondary, 'Delivered today');

  console.log('visit-log-presentation tests passed');
}

runTests();
