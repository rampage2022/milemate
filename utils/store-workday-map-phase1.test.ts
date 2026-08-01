import assert from 'node:assert/strict';

import { getStores, saveStores, __resetStoresStorageForTests, __setStoresStorageForTests } from '@/services/stores';
import {
  __resetWorkdayTemplatesStorageForTests,
  __setWorkdayTemplatesStorageForTests,
  deleteWorkdayTemplate,
  getWorkdayTemplates,
} from '@/services/workday-templates';
import type { Store } from '@/types/store';
import {
  createWorkdayTemplateId,
  createWorkdayTemplateStopId,
  type WorkdayTemplate,
} from '@/types/workday-template';
import {
  deriveWorkdayPinAbbreviationBase,
  normalizeWorkdayTemplatesCatalog,
} from '@/utils/normalize-workday-template';
import { WORKDAY_MAP_COLOR_KEYS } from '@/utils/workday-map-colors';
import {
  buildStoreWorkdayAssignmentIndex,
  summarizeStoreWorkdayMapDiagnostics,
} from '@/utils/store-workday-assignment-index';

function template(partial: Partial<WorkdayTemplate> & Pick<WorkdayTemplate, 'id' | 'name'>): WorkdayTemplate {
  const now = '2026-01-15T12:00:00.000Z';

  return {
    stops: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function stop(storeId?: string) {
  return {
    id: createWorkdayTemplateStopId(),
    storeId,
    displayName: 'Stop',
    address: '1 Main St',
  };
}

async function runTests() {
  __resetWorkdayTemplatesStorageForTests();
  __resetStoresStorageForTests();

  assert.equal(deriveWorkdayPinAbbreviationBase('Monday'), 'M');
  assert.equal(deriveWorkdayPinAbbreviationBase('Tuesday'), 'T');
  assert.equal(deriveWorkdayPinAbbreviationBase('Route A'), 'RA');
  assert.equal(deriveWorkdayPinAbbreviationBase('North Dallas'), 'ND');
  assert.equal(deriveWorkdayPinAbbreviationBase('High Priority'), 'HP');

  const noMetadata = template({
    id: 'wd-1',
    name: 'Monday',
    stops: [stop('store-a')],
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  const normalizedOnce = normalizeWorkdayTemplatesCatalog([noMetadata]);
  assert.equal(normalizedOnce.changed, true);
  assert.ok(normalizedOnce.templates[0]?.mapColorKey);
  assert.ok(normalizedOnce.templates[0]?.pinAbbreviation);

  const normalizedTwice = normalizeWorkdayTemplatesCatalog(normalizedOnce.templates);
  assert.equal(normalizedTwice.changed, false);
  assert.deepEqual(
    normalizedTwice.templates[0]?.mapColorKey,
    normalizedOnce.templates[0]?.mapColorKey,
  );
  assert.deepEqual(
    normalizedTwice.templates[0]?.pinAbbreviation,
    normalizedOnce.templates[0]?.pinAbbreviation,
  );

  const manyTemplates = WORKDAY_MAP_COLOR_KEYS.map((_, index) =>
    template({
      id: `wd-color-${index}`,
      name: `Route ${index}`,
      createdAt: `2026-01-0${index + 1}T00:00:00.000Z`,
      stops: [stop(`store-${index}`)],
    }),
  );
  const colorResult = normalizeWorkdayTemplatesCatalog(manyTemplates);
  const assignedColors = new Set(
    colorResult.templates.map((entry) => entry.mapColorKey),
  );
  assert.equal(assignedColors.size, WORKDAY_MAP_COLOR_KEYS.length);

  const collisionTemplates = [
    template({
      id: 'wd-monday-a',
      name: 'Monday',
      createdAt: '2026-01-01T00:00:00.000Z',
      stops: [stop('store-1')],
    }),
    template({
      id: 'wd-monday-b',
      name: 'Monday Route',
      createdAt: '2026-01-02T00:00:00.000Z',
      stops: [stop('store-2')],
    }),
  ];
  const collisionResult = normalizeWorkdayTemplatesCatalog(collisionTemplates);
  const abbreviations = collisionResult.templates.map((entry) => entry.pinAbbreviation);
  assert.equal(new Set(abbreviations).size, 2);

  const emptyTemplate = template({ id: 'wd-empty', name: 'Empty', stops: [] });
  const remap = new Map<string, string>([['store-old', 'store-new']]);

  const singleMembership = buildStoreWorkdayAssignmentIndex({
    templates: [
      template({
        id: 'wd-a',
        name: 'A',
        stops: [stop('store-a'), stop(undefined), stop('store-a')],
      }),
    ],
    storeIdRemap: remap,
  });
  assert.deepEqual(singleMembership.byStoreId.get('store-a')?.workdayIds, ['wd-a']);
  assert.equal(singleMembership.byStoreId.get('store-a')?.primaryWorkdayId, 'wd-a');
  assert.equal(singleMembership.orphanedStoreReferences.length, 0);

  const multiMembership = buildStoreWorkdayAssignmentIndex({
    templates: [
      template({
        id: 'wd-later',
        name: 'Later',
        createdAt: '2026-02-01T00:00:00.000Z',
        stops: [stop('store-shared')],
      }),
      template({
        id: 'wd-earlier',
        name: 'Earlier',
        createdAt: '2026-01-01T00:00:00.000Z',
        stops: [stop('store-shared')],
      }),
    ],
    storeIdRemap: new Map(),
  });
  const shared = multiMembership.byStoreId.get('store-shared');
  assert.deepEqual(shared?.workdayIds, ['wd-earlier', 'wd-later']);
  assert.equal(shared?.primaryWorkdayId, 'wd-earlier');

  const aliasMembership = buildStoreWorkdayAssignmentIndex({
    templates: [
      template({
        id: 'wd-alias',
        name: 'Alias',
        stops: [stop('store-old')],
      }),
    ],
    storeIdRemap: remap,
  });
  assert.ok(aliasMembership.byStoreId.has('store-new'));
  assert.equal(aliasMembership.byStoreId.get('store-new')?.workdayIds[0], 'wd-alias');

  const validStoreIds = new Set(['store-known']);
  const orphanIndex = buildStoreWorkdayAssignmentIndex({
    templates: [
      template({
        id: 'wd-orphan',
        name: 'Orphan',
        stops: [stop('store-missing')],
      }),
      template({
        id: 'wd-known',
        name: 'Known',
        stops: [stop('store-known')],
      }),
    ],
    storeIdRemap: new Map(),
    validStoreIds,
  });
  assert.equal(orphanIndex.byStoreId.size, 1);
  assert.deepEqual(orphanIndex.orphanedStoreReferences, [
    { workdayTemplateId: 'wd-orphan', storeId: 'store-missing' },
  ]);

  const beforeDelete = buildStoreWorkdayAssignmentIndex({
    templates: [
      template({ id: 'wd-keep', name: 'Keep', stops: [stop('store-x')] }),
      template({ id: 'wd-drop', name: 'Drop', stops: [stop('store-x')] }),
    ],
    storeIdRemap: new Map(),
  });
  assert.equal(beforeDelete.byStoreId.get('store-x')?.workdayIds.length, 2);

  const afterDelete = buildStoreWorkdayAssignmentIndex({
    templates: [template({ id: 'wd-keep', name: 'Keep', stops: [stop('store-x')] })],
    storeIdRemap: new Map(),
  });
  assert.deepEqual(afterDelete.byStoreId.get('store-x')?.workdayIds, ['wd-keep']);

  __setWorkdayTemplatesStorageForTests([
    template({
      id: createWorkdayTemplateId(),
      name: 'Persist Me',
      stops: [stop('store-persist')],
    }),
  ]);

  const storeBefore: Store = {
    id: 'store-persist',
    name: 'Persist Store',
    addressLine1: '1 Main',
    city: 'Dallas',
    state: 'TX',
    postalCode: '75001',
    latitude: 32.9,
    longitude: -96.8,
    createdAt: 1,
    updatedAt: 1,
  };
  __setStoresStorageForTests([storeBefore]);
  await saveStores([storeBefore]);

  const loaded = await getWorkdayTemplates();
  assert.ok(loaded[0]?.mapColorKey);
  assert.ok(loaded[0]?.pinAbbreviation);

  const loadedAgain = await getWorkdayTemplates();
  assert.equal(loaded[0]?.mapColorKey, loadedAgain[0]?.mapColorKey);
  assert.equal(loaded[0]?.pinAbbreviation, loadedAgain[0]?.pinAbbreviation);

  const storesSnapshot = await getStores();
  assert.equal(storesSnapshot.length, 1);
  assert.equal(storesSnapshot[0]?.id, 'store-persist');
  assert.equal(storesSnapshot[0]?.name, 'Persist Store');

  const emptyIndex = buildStoreWorkdayAssignmentIndex({
    templates: [emptyTemplate],
    storeIdRemap: new Map(),
  });
  assert.equal(emptyIndex.byStoreId.size, 0);

  const summary = summarizeStoreWorkdayMapDiagnostics({
    templates: loaded,
    storeCount: 2,
    assignmentIndex: buildStoreWorkdayAssignmentIndex({
      templates: loaded,
      storeIdRemap: new Map(),
      validStoreIds: new Set(['store-persist', 'store-unassigned']),
    }),
  });
  assert.equal(summary.templateCount, 1);
  assert.equal(summary.templatesWithMapMetadata, 1);
  assert.equal(summary.assignedStoreCount, 1);
  assert.equal(summary.unassignedStoreCount, 1);

  __setWorkdayTemplatesStorageForTests([
    template({ id: 'wd-del', name: 'Delete', stops: [stop('store-z')] }),
  ]);
  await getWorkdayTemplates();
  await deleteWorkdayTemplate('wd-del');
  const afterTemplateDelete = await getWorkdayTemplates();
  assert.equal(afterTemplateDelete.length, 0);

  __resetWorkdayTemplatesStorageForTests();
  __resetStoresStorageForTests();
  console.log('store-workday-map-phase1 tests passed');
}

void runTests();
