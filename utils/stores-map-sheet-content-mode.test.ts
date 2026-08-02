import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import {
  pickStoresMapSelectedStoreSubtitle,
  resolveStoresMapSheetContentMode,
  shouldStoresMapSheetAllowExpandedSnap,
} from '@/utils/stores-map-sheet-content-mode';
import type { StoresMapPreviewModel } from '@/utils/stores-map-model';
import { clampStoresMapSheetSnapForContentMode } from '@/components/stores/stores-map-sheet-snap';

function preview(partial?: Partial<StoresMapPreviewModel>): StoresMapPreviewModel {
  const store: Store = {
    id: 'store-a',
    name: 'Racetrac',
    addressLine1: '1 Main St',
    city: 'Dallas',
    state: 'TX',
    postalCode: '75001',
    createdAt: 1,
    updatedAt: 1,
  };

  return {
    address: '1 Main St, Dallas, TX',
    contextLabels: [{ kind: 'smart', text: 'Delivery soon' }],
    membershipRows: [{ isPrimary: true, name: 'North Route', templateId: 'wd-1' }],
    primaryWorkdayLabel: 'North Route',
    store,
    storeNumberLabel: '1234',
    visit: null,
    ...partial,
  };
}

function runTests() {
  assert.equal(
    resolveStoresMapSheetContentMode({ preview: undefined, selectedStoreId: null }),
    'browse',
  );
  assert.equal(
    resolveStoresMapSheetContentMode({ preview: preview(), selectedStoreId: 'store-a' }),
    'selected-store',
  );
  assert.equal(
    resolveStoresMapSheetContentMode({ preview: undefined, selectedStoreId: 'store-a' }),
    'browse',
  );

  assert.equal(shouldStoresMapSheetAllowExpandedSnap('browse'), true);
  assert.equal(shouldStoresMapSheetAllowExpandedSnap('selected-store'), false);

  assert.equal(
    clampStoresMapSheetSnapForContentMode({ allowExpanded: false, snap: 'expanded' }),
    'medium',
  );
  assert.equal(
    clampStoresMapSheetSnapForContentMode({ allowExpanded: true, snap: 'expanded' }),
    'expanded',
  );

  assert.equal(pickStoresMapSelectedStoreSubtitle(preview()), 'Delivery soon');
  assert.equal(
    pickStoresMapSelectedStoreSubtitle(
      preview({ contextLabels: [], membershipRows: [], primaryWorkdayLabel: 'Unassigned' }),
    ),
    '1 Main St',
  );

  console.log('stores-map-sheet-content-mode tests passed');
}

runTests();
