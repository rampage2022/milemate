import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import type { WorkdayTemplate } from '@/types/workday-template';
import {
  buildStoresMapModel,
  buildStoreMarkerAccessibilityLabel,
  computeStoresMapFitRegion,
  computeStoresMapFitRegionKey,
  filterStoresMapItemsByWorkday,
  storeHasMappableCoordinates,
} from '@/utils/stores-map-model';
import { buildStoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import { createWorkdayTemplateStopId } from '@/types/workday-template';

function store(partial: Partial<Store> & Pick<Store, 'id' | 'name'>): Store {
  const now = Date.now();

  return {
    addressLine1: '1 Main St',
    city: 'Dallas',
    state: 'TX',
    postalCode: '75001',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function template(partial: Partial<WorkdayTemplate> & Pick<WorkdayTemplate, 'id' | 'name'>): WorkdayTemplate {
  const now = '2026-01-01T00:00:00.000Z';

  return {
    stops: [],
    createdAt: now,
    updatedAt: now,
    mapColorKey: 'blue',
    pinAbbreviation: 'M',
    ...partial,
  };
}

async function runTests() {
  const monday = template({
    id: 'wd-monday',
    name: 'Monday',
    mapColorKey: 'green',
    pinAbbreviation: 'M',
    stops: [
      {
        id: createWorkdayTemplateStopId(),
        storeId: 'store-a',
        displayName: 'A',
        address: 'A',
      },
    ],
  });
  const routeA = template({
    id: 'wd-route-a',
    name: 'Route A',
    mapColorKey: 'orange',
    pinAbbreviation: 'RA',
    createdAt: '2026-01-02T00:00:00.000Z',
    stops: [
      {
        id: createWorkdayTemplateStopId(),
        storeId: 'store-b',
        displayName: 'B',
        address: 'B',
      },
      {
        id: createWorkdayTemplateStopId(),
        storeId: 'store-shared',
        displayName: 'Shared',
        address: 'Shared',
      },
    ],
  });

  const templates = [monday, routeA];
  const assignmentIndex = buildStoreWorkdayAssignmentIndex({
    templates,
    storeIdRemap: new Map([['store-old', 'store-a']]),
    validStoreIds: new Set(['store-a', 'store-b', 'store-shared', 'store-unassigned', 'store-missing-coords']),
  });

  const items = [
    {
      store: store({
        id: 'store-a',
        name: 'Harbor Market 142',
        latitude: 32.77,
        longitude: -96.8,
      }),
      visit: null,
    },
    {
      store: store({
        id: 'store-b',
        name: 'Southside Foods',
        latitude: 32.75,
        longitude: -96.79,
      }),
      visit: null,
    },
    {
      store: store({
        id: 'store-shared',
        name: 'Riverbend Market',
        latitude: 32.76,
        longitude: -96.81,
      }),
      visit: null,
    },
    {
      store: store({
        id: 'store-unassigned',
        name: 'Unassigned Store',
        latitude: 32.74,
        longitude: -96.82,
      }),
      visit: null,
    },
    {
      store: store({
        id: 'store-missing-coords',
        name: 'No Coords',
      }),
      visit: null,
    },
    {
      store: store({
        id: 'store-nan',
        name: 'Bad Coords',
        latitude: Number.NaN,
        longitude: Number.NaN,
      }),
      visit: null,
    },
  ];

  assert.equal(storeHasMappableCoordinates(items[0]!.store), true);
  assert.equal(storeHasMappableCoordinates(items[4]!.store), false);
  assert.equal(storeHasMappableCoordinates(items[5]!.store), false);

  const allModel = buildStoresMapModel({
    assignmentIndex,
    items,
    templates,
    workdayFilter: 'all',
  });

  assert.equal(allModel.counts.total, 6);
  assert.equal(allModel.counts.onMap, 4);
  assert.equal(allModel.counts.missingLocation, 2);
  assert.equal(allModel.markers.length, 4);
  assert.equal(allModel.emptyKind, 'none');

  const assignedMarker = allModel.markers.find((marker) => marker.storeId === 'store-a');
  assert.ok(assignedMarker);
  assert.equal(assignedMarker?.pinAbbreviation, 'M');
  assert.equal(assignedMarker?.markerBackground, '#34C759');

  const unassignedMarker = allModel.markers.find((marker) => marker.storeId === 'store-unassigned');
  assert.ok(unassignedMarker);
  assert.equal(unassignedMarker?.pinAbbreviation, 'U');
  assert.equal(unassignedMarker?.markerBackground, '#636366');

  const sharedMarker = allModel.markers.find((marker) => marker.storeId === 'store-shared');
  assert.ok(sharedMarker);
  assert.equal(sharedMarker?.pinAbbreviation, 'RA');
  assert.equal(sharedMarker?.markerBackground, '#FF9500');

  const sharedPreview = allModel.previewByStoreId['store-shared'];
  assert.equal(sharedPreview?.membershipRows.length, 1);
  assert.equal(sharedPreview?.primaryWorkdayLabel, 'Route A');

  assert.equal(
    buildStoreMarkerAccessibilityLabel({
      store: items[0]!.store,
      workdayNames: ['Monday'],
    }),
    'Harbor Market 142, assigned to Monday',
  );

  const multiTemplate = template({
    id: 'wd-multi',
    name: 'North Dallas',
    mapColorKey: 'purple',
    pinAbbreviation: 'ND',
    createdAt: '2026-01-03T00:00:00.000Z',
    stops: [
      {
        id: createWorkdayTemplateStopId(),
        storeId: 'store-shared',
        displayName: 'Shared',
        address: 'Shared',
      },
    ],
  });
  const templatesWithMulti = [...templates, multiTemplate];
  const multiIndex = buildStoreWorkdayAssignmentIndex({
    templates: templatesWithMulti,
    storeIdRemap: new Map(),
    validStoreIds: new Set(['store-shared']),
  });
  const multiModel = buildStoresMapModel({
    assignmentIndex: multiIndex,
    items: [items[2]!],
    templates: templatesWithMulti,
    workdayFilter: 'all',
  });
  assert.equal(multiModel.previewByStoreId['store-shared']?.membershipRows.length, 2);
  assert.equal(multiModel.markers[0]?.pinAbbreviation, 'RA');
  assert.equal(multiModel.markers[0]?.markerBackground, '#FF9500');

  const mondayOnly = filterStoresMapItemsByWorkday({
    assignmentIndex,
    items,
    workdayFilter: 'workday:wd-monday',
  });
  assert.equal(mondayOnly.length, 1);

  const unassignedOnly = filterStoresMapItemsByWorkday({
    assignmentIndex,
    items,
    workdayFilter: 'unassigned',
  });
  assert.deepEqual(
    unassignedOnly.map((item) => item.store.id).sort(),
    ['store-missing-coords', 'store-nan', 'store-unassigned'].sort(),
  );

  const searchScoped = items.filter((item) => item.store.name.includes('Harbor'));
  const searchModel = buildStoresMapModel({
    assignmentIndex,
    items: searchScoped,
    templates,
    workdayFilter: 'all',
  });
  assert.equal(searchModel.counts.total, 1);
  assert.equal(searchModel.counts.onMap, 1);

  const removedSelectionModel = buildStoresMapModel({
    assignmentIndex,
    items: items.filter((item) => item.store.id !== 'store-a'),
    templates,
    workdayFilter: 'all',
  });
  assert.equal(removedSelectionModel.previewByStoreId['store-a'], undefined);

  const oneStoreRegion = computeStoresMapFitRegion([{ latitude: 32.77, longitude: -96.8 }]);
  assert.ok(oneStoreRegion.latitudeDelta >= 0.08);

  const multiRegion = computeStoresMapFitRegion([
    { latitude: 32.77, longitude: -96.8 },
    { latitude: 32.75, longitude: -96.79 },
  ]);
  assert.ok(multiRegion.latitudeDelta > 0);

  const emptyModel = buildStoresMapModel({
    assignmentIndex,
    items: [],
    templates,
    workdayFilter: 'all',
  });
  assert.equal(emptyModel.emptyKind, 'no_stores_in_scope');

  const noCoordsModel = buildStoresMapModel({
    assignmentIndex,
    items: [items[4]!, items[5]!],
    templates,
    workdayFilter: 'all',
  });
  assert.equal(noCoordsModel.emptyKind, 'no_mappable_stores');
  assert.equal(noCoordsModel.counts.onMap, 0);

  const aliasItems = [
    {
      store: store({
        id: 'store-a',
        name: 'Alias Resolved Store',
        latitude: 32.78,
        longitude: -96.77,
      }),
      visit: null,
    },
  ];
  const aliasModel = buildStoresMapModel({
    assignmentIndex,
    items: aliasItems,
    templates,
    workdayFilter: 'all',
  });
  assert.equal(aliasModel.markers[0]?.storeId, 'store-a');
  assert.equal(aliasModel.markers[0]?.pinAbbreviation, 'M');

  const keyA = computeStoresMapFitRegionKey({
    filter: 'all',
    markerStoreIds: ['b', 'a'],
  });
  const keyB = computeStoresMapFitRegionKey({
    filter: 'all',
    markerStoreIds: ['a', 'b'],
  });
  assert.equal(keyA, keyB);

  console.log('stores-map-model tests passed');
}

void runTests();
