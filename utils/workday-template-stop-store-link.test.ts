import assert from 'node:assert/strict';

import {
  __resetStoresStorageForTests,
  __setStoresStorageForTests,
} from '@/services/stores';
import {
  __resetWorkdayTemplatesStorageForTests,
} from '@/services/workday-templates';
import type { Store } from '@/types/store';
import {
  createWorkdayTemplateStopId,
  type WorkdayTemplate,
  type WorkdayTemplateStop,
} from '@/types/workday-template';
import { reconcileWorkdayTemplatesInMemory } from '@/services/reconcile-workday-template-stores';
import {
  buildStoreWorkdayAssignmentIndex,
} from '@/utils/store-workday-assignment-index';
import {
  isRouteOnlyWorkdayTemplateStop,
  reconcileWorkdayTemplateStopAgainstStores,
} from '@/utils/workday-template-stop-store-link';

function store(partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'addressLine1' | 'city' | 'state' | 'postalCode'>): Store {
  const now = Date.now();

  return {
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function template(partial: Partial<WorkdayTemplate> & Pick<WorkdayTemplate, 'id' | 'name' | 'stops'>): WorkdayTemplate {
  const now = '2026-01-15T12:00:00.000Z';

  return {
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function stop(partial: Partial<WorkdayTemplateStop> & Pick<WorkdayTemplateStop, 'displayName' | 'address'>): WorkdayTemplateStop {
  return {
    id: createWorkdayTemplateStopId(),
    sourceType: 'store',
    ...partial,
  };
}

function runTests() {
  __resetStoresStorageForTests();
  __resetWorkdayTemplatesStorageForTests();

  const canonical = store({
    id: 'store-canonical',
    name: 'Target #1234',
    storeNumber: '1234',
    addressLine1: '100 Main St',
    city: 'Dallas',
    state: 'TX',
    postalCode: '75201',
    latitude: 32.78,
    longitude: -96.8,
  });

  const stores = [canonical];

  const direct = reconcileWorkdayTemplateStopAgainstStores({
    stop: stop({
      storeId: 'store-canonical',
      displayName: 'Snapshot Name',
      address: '100 Main St, Dallas, TX 75201',
    }),
    stores,
    storeIdRemap: new Map(),
  });
  assert.equal(direct.linkMethod, 'direct');
  assert.equal(direct.stop.displayName, 'Snapshot Name');
  assert.equal(direct.stopChanged, false);

  const alias = reconcileWorkdayTemplateStopAgainstStores({
    stop: stop({
      storeId: 'store-stale',
      displayName: 'Target #1234',
      address: '100 Main St, Dallas, TX 75201',
    }),
    stores,
    storeIdRemap: new Map([['store-stale', 'store-canonical']]),
  });
  assert.equal(alias.linkMethod, 'import_alias');
  assert.equal(alias.stop.storeId, 'store-canonical');
  assert.equal(alias.stopChanged, true);

  const byAddress = reconcileWorkdayTemplateStopAgainstStores({
    stop: stop({
      storeId: 'store-deleted',
      displayName: 'Target #1234',
      address: '100 Main St, Dallas, TX 75201',
    }),
    stores,
    storeIdRemap: new Map(),
  });
  assert.ok(
    byAddress.linkMethod === 'duplicate_address' ||
      byAddress.linkMethod === 'duplicate_store_number',
  );
  assert.equal(byAddress.stop.storeId, 'store-canonical');

  const mondayStop = stop({
    storeId: 'store-monday-id',
    displayName: 'Target #1234',
    address: '100 Main St, Dallas, TX 75201',
  });
  const tuesdayStop = stop({
    storeId: 'store-tuesday-id',
    displayName: 'Target #1234',
    address: '100 Main St, Dallas, TX 75201',
  });

  const multiTemplateResult = reconcileWorkdayTemplatesInMemory({
    templates: [
      template({ id: 'wd-mon', name: 'Monday', stops: [mondayStop] }),
      template({ id: 'wd-tue', name: 'Tuesday', stops: [tuesdayStop] }),
    ],
    stores,
    storeIdRemap: new Map(),
  });
  assert.equal(multiTemplateResult.stopsRepaired, 2);

  const multiIndex = buildStoreWorkdayAssignmentIndex({
    templates: multiTemplateResult.templates,
    storeIdRemap: new Map(),
    validStoreIds: new Set(['store-canonical']),
  });
  assert.equal(multiIndex.byStoreId.size, 1);
  assert.deepEqual(multiIndex.byStoreId.get('store-canonical')?.workdayIds.sort(), [
    'wd-mon',
    'wd-tue',
  ]);

  const createFromSnapshot = reconcileWorkdayTemplateStopAgainstStores({
    stop: stop({
      displayName: 'New Store #9999',
      address: '500 Elm St, Plano, TX 75024',
      sourceType: 'store',
    }),
    stores,
    storeIdRemap: new Map(),
  });
  assert.equal(createFromSnapshot.linkMethod, 'created_store');
  assert.ok(createFromSnapshot.createdStore);
  assert.equal(createFromSnapshot.createdStore?.storeNumber, '9999');

  const addressOnly = reconcileWorkdayTemplateStopAgainstStores({
    stop: stop({
      displayName: 'Custom Stop',
      address: '1 Park Ln, Dallas, TX 75201',
      sourceType: 'manual',
    }),
    stores,
    storeIdRemap: new Map(),
  });
  assert.equal(addressOnly.linkMethod, 'route_only');
  assert.ok(isRouteOnlyWorkdayTemplateStop(addressOnly.stop));

  const similarName = reconcileWorkdayTemplateStopAgainstStores({
    stop: stop({
      storeId: 'store-other',
      displayName: 'Target',
      address: '900 Other Rd, Dallas, TX 75202',
      sourceType: 'store',
    }),
    stores: [
      store({
        id: 'store-other-name',
        name: 'Target',
        addressLine1: '100 Main St',
        city: 'Dallas',
        state: 'TX',
        postalCode: '75201',
      }),
    ],
    storeIdRemap: new Map(),
  });
  assert.equal(similarName.linkMethod, 'created_store');

  const firstRun = reconcileWorkdayTemplatesInMemory({
    templates: [
      template({
        id: 'wd-create',
        name: 'Create',
        stops: [
          stop({
            storeId: 'missing-1',
            displayName: 'Shop #7777',
            address: '200 Oak Ave, Frisco, TX 75034',
            sourceType: 'store',
          }),
        ],
      }),
    ],
    stores: [],
    storeIdRemap: new Map(),
  });
  assert.equal(firstRun.createdStoreCount, 1);
  const createdId = firstRun.templates[0]?.stops[0]?.storeId;
  assert.ok(createdId);

  const secondRun = reconcileWorkdayTemplatesInMemory({
    templates: firstRun.templates,
    stores: [...firstRun.storesCreated],
    storeIdRemap: new Map(),
  });
  assert.equal(secondRun.createdStoreCount, 0);
  assert.equal(secondRun.stopsRepaired, 0);
  assert.equal(secondRun.templates[0]?.stops[0]?.storeId, createdId);

  const orderTemplate = template({
    id: 'wd-order',
    name: 'Order',
    stops: [
      stop({ storeId: 'x', displayName: 'A', address: '100 Main St, Dallas, TX 75201' }),
      stop({ storeId: 'y', displayName: 'B', address: '200 Oak Ave, Frisco, TX 75034', sourceType: 'store' }),
    ],
  });
  const orderMeta = orderTemplate.mapColorKey;
  const orderResult = reconcileWorkdayTemplatesInMemory({
    templates: [{ ...orderTemplate, mapColorKey: 'blue' as const, pinAbbreviation: 'O' }],
    stores,
    storeIdRemap: new Map(),
  });
  assert.equal(orderResult.templates[0]?.stops.length, 2);
  assert.equal(orderResult.templates[0]?.mapColorKey, 'blue');
  assert.equal(orderResult.templates[0]?.pinAbbreviation, 'O');
  assert.equal(orderMeta, undefined);

  const unresolved = reconcileWorkdayTemplateStopAgainstStores({
    stop: stop({
      storeId: 'ghost',
      displayName: 'X',
      address: '???',
      sourceType: 'store',
    }),
    stores,
    storeIdRemap: new Map(),
  });
  assert.equal(unresolved.linkMethod, 'unresolved');

  __setStoresStorageForTests([canonical]);
  const savedCanonical = reconcileWorkdayTemplatesInMemory({
    templates: [
      template({
        id: 'wd-save',
        name: 'Saved Canonical',
        stops: [
          stop({
            storeId: 'store-canonical',
            displayName: 'Target #1234',
            address: '100 Main St, Dallas, TX 75201',
          }),
        ],
      }),
    ],
    stores: [canonical],
    storeIdRemap: new Map(),
  });
  const orphanIndex = buildStoreWorkdayAssignmentIndex({
    templates: savedCanonical.templates,
    storeIdRemap: new Map(),
    validStoreIds: new Set(['store-canonical']),
  });
  assert.equal(orphanIndex.orphanedStoreReferences.length, 0);
  assert.equal(savedCanonical.templates[0]?.stops[0]?.storeId, 'store-canonical');

  __resetWorkdayTemplatesStorageForTests();
  __resetStoresStorageForTests();
  console.log('workday-template-stop-store-link tests passed');
}

void runTests();
