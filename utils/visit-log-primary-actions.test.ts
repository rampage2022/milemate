import assert from 'node:assert/strict';

import {
  resolveVisitLogPrimaryActionMode,
  isVisitLogActiveRouteStop,
} from '@/utils/visit-log-primary-actions';
import { buildVisitLogSheetActions, visitLogSheetActionIds } from '@/utils/visit-log-presentation';
import type { StoreVisit } from '@/types/store-visit';

function runTests() {
  assert.equal(resolveVisitLogPrimaryActionMode('pending'), 'check_in_and_skip');
  assert.equal(resolveVisitLogPrimaryActionMode('current'), 'check_in_and_skip');
  assert.equal(resolveVisitLogPrimaryActionMode('checked_in'), 'finish_and_skip');
  assert.equal(resolveVisitLogPrimaryActionMode('completed'), 'none');
  assert.equal(resolveVisitLogPrimaryActionMode('skipped'), 'none');

  assert.equal(isVisitLogActiveRouteStop('checked_in'), true);
  assert.equal(isVisitLogActiveRouteStop('completed'), false);

  const actions = buildVisitLogSheetActions({
    checkedInLabel: null,
    deliveryDetail: { label: '', tone: 'default', value: '' },
    deliveryTile: {
      accent: 'orange',
      statusLine: '',
      timeLine: '',
      title: 'Delivery',
    },
    deliveryActionSecondary: null,
    hasDeliveryAlert: false,
    lastVisitDateLabel: null,
    lastVisitMetadataLine: null,
    lastVisitRelativeLabel: null,
    managerDisplayName: null,
    noteCount: 0,
    notesLastLabel: null,
    orderHistoryCount: 0,
    photoCount: 0,
    photosLastLabel: null,
    showManagerRow: false,
    showOperationalDivider: false,
    showStoreStatusRow: false,
    storeIdentity: { title: 'Demo', addressLine: '1 Main' },
    storeOpenStatus: {
      badgeText: null,
      detailMinutes: null,
      isOpen: false,
      kind: 'unknown',
      statusLabel: 'Unknown',
      valueColor: 'muted',
    },
    storeStatusBadge: null,
    storeStatusLabel: 'Unknown',
  });

  const ids = visitLogSheetActionIds(actions);
  assert.ok(!ids.includes('complete-visit' as never));
  assert.equal(actions.find((a) => a.id === 'delivery')?.title, 'Log Delivery');

  console.log('visit-log-primary-actions tests passed');
}

runTests();
