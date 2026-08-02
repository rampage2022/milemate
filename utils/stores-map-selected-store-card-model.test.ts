import assert from 'node:assert/strict';

import type { StoreOrder } from '@/types/store-order';
import type { StoreVisit } from '@/types/store-visit';
import type { Store } from '@/types/store';
import {
  buildStoresMapSelectedStoreCardModel,
  formatRelativeDeliveryDay,
  truncateStoresMapNotePreview,
} from '@/utils/stores-map-selected-store-card-model';
import type { StoresMapPreviewModel } from '@/utils/stores-map-model';
import { buildStoresMapSmartFilterIndex } from '@/utils/stores-map-smart-filter-index';
import { createDefaultStoresMapFilterState } from '@/utils/stores-map-filter-state';

function store(id: string): Store {
  const now = Date.now();

  return {
    id,
    name: 'Harbor Market',
    storeNumber: '142',
    addressLine1: '1200 Industrial Blvd',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62703',
    createdAt: now,
    updatedAt: now,
  };
}

function unassignedPreview(): StoresMapPreviewModel {
  return {
    address: '1200 Industrial Blvd, Springfield, IL 62703',
    contextLabels: [],
    membershipRows: [],
    primaryWorkdayLabel: 'Unassigned',
    store: store('store-a'),
    storeNumberLabel: '#142',
    visit: null,
  };
}

function preview(): StoresMapPreviewModel {
  return {
    address: '1200 Industrial Blvd, Springfield, IL 62703',
    contextLabels: [],
    membershipRows: [{ isPrimary: true, name: 'Tuesday New', templateId: 'wd-1' }],
    primaryWorkdayLabel: 'Tuesday New',
    store: store('store-a'),
    storeNumberLabel: '#142',
    visit: null,
  };
}

function runTests() {
  const referenceDate = new Date('2026-08-01T12:00:00');
  const smartIndex = buildStoresMapSmartFilterIndex({
    checksByOrderId: {},
    orders: [],
    storeIds: ['store-a'],
    visits: [],
  });

  const emptyModel = buildStoresMapSelectedStoreCardModel({
    activeGroupNames: [],
    checksByOrderId: {},
    orders: [],
    preview: unassignedPreview(),
    referenceDate,
    resolvedVisits: [],
    smartFilterIndex: smartIndex,
  });

  assert.equal(emptyModel.lastDeliveryLabel, 'No delivery recorded');
  assert.equal(emptyModel.upcomingDeliveryLabel, 'None scheduled');
  assert.equal(emptyModel.notePreview, 'No note');
  assert.equal(emptyModel.alertLabel, 'None');
  assert.equal(emptyModel.assignmentBadge, 'Unassigned');
  assert.equal(emptyModel.showCompactVisitFocus, true);
  assert.equal(emptyModel.lastVisitLabel, 'No previous visits');
  assert.equal(emptyModel.metricVisibility.alert, false);
  assert.equal(emptyModel.metricVisibility.lastDelivery, false);
  assert.equal(emptyModel.metricVisibility.lastVisit, false);

  const completedVisit: StoreVisit = {
    createdAt: 1,
    completedAt: new Date('2026-07-28T15:00:00').getTime(),
    id: 'visit-done',
    notes: [],
    routeOrder: 1,
    scheduledDate: '07-28-26',
    status: 'completed',
    storeId: 'store-a',
    updatedAt: 1,
  };

  const compactWithVisit = buildStoresMapSelectedStoreCardModel({
    activeGroupNames: [],
    checksByOrderId: {},
    orders: [],
    preview: unassignedPreview(),
    referenceDate,
    resolvedVisits: [completedVisit],
    smartFilterIndex: smartIndex,
  });

  assert.equal(compactWithVisit.showCompactVisitFocus, true);
  assert.equal(compactWithVisit.lastVisitLabel, '4 days ago');

  const deliveredOrder: StoreOrder = {
    createdAt: '2026-07-01T00:00:00.000Z',
    deliveredAt: '2026-07-29T12:00:00.000Z',
    expectedDeliveryDate: '07-28-26',
    id: 'order-1',
    placedAt: '2026-07-01T00:00:00.000Z',
    status: 'delivered',
    storeId: 'store-a',
    updatedAt: '2026-07-29T12:00:00.000Z',
  };

  const pendingOrder: StoreOrder = {
    createdAt: '2026-08-01T00:00:00.000Z',
    expectedDeliveryDate: '08-02-26',
    id: 'order-2',
    placedAt: '2026-08-01T00:00:00.000Z',
    status: 'pending',
    storeId: 'store-a',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  const withOrders = buildStoresMapSelectedStoreCardModel({
    activeGroupNames: ['Downtown'],
    checksByOrderId: {},
    orders: [deliveredOrder, pendingOrder],
    preview: preview(),
    referenceDate,
    resolvedVisits: [],
    smartFilterIndex: smartIndex,
  });

  assert.equal(withOrders.lastDeliveryLabel, '3 days ago');
  assert.equal(withOrders.upcomingDeliveryLabel, 'Tomorrow');
  assert.equal(withOrders.showCompactVisitFocus, false);
  assert.match(withOrders.workdayGroupLabel, /Tuesday New/);
  assert.match(withOrders.workdayGroupLabel, /Downtown/);

  const visit: StoreVisit = {
    createdAt: 1,
    id: 'visit-1',
    notes: [{ createdAt: 2, id: 'n1', text: 'check rear entrance for deliveries after noon' }],
    routeOrder: 1,
    scheduledDate: '08-01-26',
    status: 'pending',
    storeId: 'store-a',
    updatedAt: 1,
  };

  const withNote = buildStoresMapSelectedStoreCardModel({
    activeGroupNames: [],
    checksByOrderId: {},
    orders: [pendingOrder],
    preview: preview(),
    referenceDate,
    resolvedVisits: [visit],
    smartFilterIndex: smartIndex,
  });

  assert.match(withNote.notePreview, /rear entrance/);

  const overduePending: StoreOrder = {
    createdAt: '2026-07-01T00:00:00.000Z',
    expectedDeliveryDate: '07-28-26',
    id: 'order-overdue',
    placedAt: '2026-07-01T00:00:00.000Z',
    status: 'pending',
    storeId: 'store-a',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };

  const missedIndex = buildStoresMapSmartFilterIndex({
    checksByOrderId: {},
    orders: [overduePending],
    referenceDate,
    storeIds: ['store-a'],
    visits: [],
  });

  const alertModel = buildStoresMapSelectedStoreCardModel({
    activeGroupNames: [],
    checksByOrderId: {},
    orders: [overduePending],
    preview: preview(),
    referenceDate,
    resolvedVisits: [],
    smartFilterIndex: missedIndex,
  });

  assert.equal(alertModel.alertLabel, 'Missed delivery');
  assert.equal(alertModel.alertTone, 'critical');

  assert.equal(
    truncateStoresMapNotePreview('short note'),
    'short note',
  );
  assert.ok(truncateStoresMapNotePreview('x'.repeat(120)).endsWith('…'));
  assert.equal(formatRelativeDeliveryDay('2026-07-31T12:00:00.000Z', referenceDate), 'Yesterday');

  assert.equal(createDefaultStoresMapFilterState().selectedWorkdayIds.length, 0);

  console.log('stores-map-selected-store-card-model tests passed');
}

runTests();
