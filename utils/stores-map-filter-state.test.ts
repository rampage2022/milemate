import assert from 'node:assert/strict';

import {
  __resetStoreGroupsStorageForTests,
  __setStoreGroupsStorageForTests,
  addStoresToGroup,
  createStoreGroup,
  deleteStoreGroup,
  getStoreGroups,
  removeStoreFromAllGroups,
} from '@/services/store-groups';
import { __resetStoreImportIdAliasesForTests } from '@/services/store-import-id-aliases';
import { __resetStoresStorageForTests, __setStoresStorageForTests } from '@/services/stores';
import { normalizeStoreGroupMemberships } from '@/utils/store-group-persistence';
import {
  applyStoresMapFilterChipPress,
  clearAllStoresMapFilters,
  clearStoresMapWorkdayFilterSelections,
  createDefaultStoresMapFilterState,
  filterStoresMapItems,
  formatStoresMapFilterSummary,
  formatStoresMapSheetCollapsedPrimaryLine,
  toggleStoresMapSmartFilter,
  toggleStoresMapStoreGroupSelection,
} from '@/utils/stores-map-filter-state';
import { buildStoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import { buildStoresMapSmartFilterIndex } from '@/utils/stores-map-smart-filter-index';
import type { Store } from '@/types/store';

function store(id: string): Store {
  const now = Date.now();

  return {
    id,
    name: id,
    addressLine1: '1 Main',
    city: 'Dallas',
    state: 'TX',
    postalCode: '75001',
    createdAt: now,
    updatedAt: now,
  };
}

async function runTests() {
  __setStoresStorageForTests([
    store('store-a'),
    store('store-b'),
  ]);
  __resetStoreImportIdAliasesForTests();
  __setStoreGroupsStorageForTests([]);
  const group = await createStoreGroup({ name: 'Racetrac', storeIds: ['store-a'] });
  await addStoresToGroup(group.id, ['store-b']);
  const groups = await getStoreGroups();
  assert.equal(groups[0]?.storeIds.length, 2);

  const remapped = normalizeStoreGroupMemberships({
    groups: [{ ...group, storeIds: ['legacy-a', 'store-b'] }],
    storeIdRemap: new Map([['legacy-a', 'store-a']]),
    validStoreIds: new Set(['store-a', 'store-b']),
  });
  assert.deepEqual(remapped[0]?.storeIds, ['store-a', 'store-b']);

  await removeStoreFromAllGroups('store-a');
  const afterRemove = await getStoreGroups();
  assert.ok(afterRemove[0]?.storeIds.every((id) => id !== 'store-a'));

  await deleteStoreGroup(group.id);
  assert.equal((await getStoreGroups()).length, 0);
  __resetStoreGroupsStorageForTests();
  __resetStoresStorageForTests();
  __resetStoreImportIdAliasesForTests();

  let state = createDefaultStoresMapFilterState();
  state = toggleStoresMapStoreGroupSelection(state, 'g1');
  state = toggleStoresMapSmartFilter(state, 'missed_delivery');
  state = applyStoresMapFilterChipPress({ chipFilterId: 'workday:wd1', state });
  assert.ok(state.selectedStoreGroupIds.includes('g1'));
  assert.ok(state.enabledSmartFilters.includes('missed_delivery'));

  const clearedWorkdays = clearStoresMapWorkdayFilterSelections(state);
  assert.equal(clearedWorkdays.selectedWorkdayIds.length, 0);
  assert.ok(clearedWorkdays.enabledSmartFilters.includes('missed_delivery'));

  const clearedAll = clearAllStoresMapFilters();
  assert.deepEqual(clearedAll.enabledSmartFilters, []);

  const items = [
    { store: store('store-a'), visit: null },
    { store: store('store-b'), visit: null },
    { store: store('store-c'), visit: null },
  ];
  const assignmentIndex = buildStoreWorkdayAssignmentIndex({
    templates: [],
    storeIdRemap: new Map(),
    validStoreIds: new Set(items.map((item) => item.store.id)),
  });
  const smartIndex = buildStoresMapSmartFilterIndex({
    orders: [],
    storeIds: items.map((item) => item.store.id),
    visits: [],
  });
  const filtered = filterStoresMapItems({
    assignmentIndex,
    groupsById: new Map([[group.id, { ...group, storeIds: ['store-a', 'store-b'] }]]),
    items,
    smartFilterIndex: smartIndex,
    state: {
      ...createDefaultStoresMapFilterState(),
      selectedStoreGroupIds: [group.id],
    },
  });
  assert.equal(filtered.length, 2);

  const summary = formatStoresMapFilterSummary({
    groupsById: new Map([[group.id, group]]),
    scopeLabel: 'All Stores',
    state: {
      ...createDefaultStoresMapFilterState(),
      enabledSmartFilters: ['missed_delivery'],
      selectedStoreGroupIds: [group.id],
    },
    templatesById: new Map(),
    visibleStoreCount: 4,
  });
  assert.ok(summary.includes('4 stores'));

  assert.equal(
    formatStoresMapSheetCollapsedPrimaryLine({
      groupsById: new Map(),
      scopeLabel: 'All Stores',
      state: createDefaultStoresMapFilterState(),
      templatesById: new Map(),
      visibleStoreCount: 36,
    }),
    'All Stores · 36',
  );

  console.log('stores-map-filter-state tests passed');
}

void runTests();
