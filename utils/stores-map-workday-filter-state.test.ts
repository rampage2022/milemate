import assert from 'node:assert/strict';

import type { WorkdayTemplate } from '@/types/workday-template';
import { buildStoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import { createWorkdayTemplateStopId } from '@/types/workday-template';
import type { Store } from '@/types/store';
import {
  applyStoresMapWorkdayFilterChipPress,
  clearStoresMapWorkdayFilters,
  createDefaultStoresMapWorkdayFilterState,
  filterStoresMapItemsByWorkdayState,
  formatStoresMapWorkdayFilterSummary,
  isStoresMapWorkdayFilterShowingAll,
  sanitizeStoresMapWorkdayFilterState,
  toggleStoresMapWorkdaySelection,
  toggleStoresMapUnassignedFilter,
} from '@/utils/stores-map-workday-filter-state';

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

function template(id: string, name: string, storeId: string): WorkdayTemplate {
  return {
    id,
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    mapColorKey: 'blue',
    pinAbbreviation: 'X',
    stops: [
      {
        id: createWorkdayTemplateStopId(),
        storeId,
        displayName: 'Stop',
        address: '1 Main',
        sourceType: 'store',
      },
    ],
  };
}

function runTests() {
  const defaultState = createDefaultStoresMapWorkdayFilterState();
  assert.equal(isStoresMapWorkdayFilterShowingAll(defaultState), true);

  const monday = template('wd-mon', 'Monday', 'store-a');
  const tuesday = template('wd-tue', 'Tuesday', 'store-b');
  const templates = [monday, tuesday];
  const templatesById = new Map(templates.map((entry) => [entry.id, entry]));
  const items = [
    { store: store('store-a'), visit: null },
    { store: store('store-b'), visit: null },
    { store: store('store-u'), visit: null },
  ];
  const assignmentIndex = buildStoreWorkdayAssignmentIndex({
    templates,
    storeIdRemap: new Map(),
    validStoreIds: new Set(['store-a', 'store-b', 'store-u']),
  });

  let state = toggleStoresMapWorkdaySelection(defaultState, 'wd-mon');
  assert.deepEqual(state.selectedWorkdayIds, ['wd-mon']);
  assert.equal(
    filterStoresMapItemsByWorkdayState({ assignmentIndex, items, state }).length,
    1,
  );

  state = toggleStoresMapWorkdaySelection(state, 'wd-tue');
  assert.deepEqual(state.selectedWorkdayIds, ['wd-mon', 'wd-tue']);
  const orFiltered = filterStoresMapItemsByWorkdayState({ assignmentIndex, items, state });
  assert.deepEqual(
    orFiltered.map((item) => item.store.id).sort(),
    ['store-a', 'store-b'],
  );

  state = toggleStoresMapWorkdaySelection(state, 'wd-mon');
  assert.deepEqual(state.selectedWorkdayIds, ['wd-tue']);

  state = toggleStoresMapUnassignedFilter(createDefaultStoresMapWorkdayFilterState());
  assert.equal(state.includeUnassigned, true);
  const unassignedOnly = filterStoresMapItemsByWorkdayState({
    assignmentIndex,
    items,
    state,
  });
  assert.deepEqual(unassignedOnly.map((item) => item.store.id), ['store-u']);

  state = {
    selectedWorkdayIds: ['wd-mon'],
    includeUnassigned: true,
  };
  const combined = filterStoresMapItemsByWorkdayState({ assignmentIndex, items, state });
  assert.deepEqual(
    combined.map((item) => item.store.id).sort(),
    ['store-a', 'store-u'],
  );

  state = clearStoresMapWorkdayFilters();
  assert.equal(isStoresMapWorkdayFilterShowingAll(state), true);
  assert.equal(
    applyStoresMapWorkdayFilterChipPress({
      chipFilterId: 'all',
      state: {
        selectedWorkdayIds: ['wd-mon'],
        includeUnassigned: true,
      },
    }).selectedWorkdayIds.length,
    0,
  );

  const todayScoped = items.filter((item) => item.store.id !== 'store-b');
  const searchScoped = todayScoped.filter((item) => item.store.id === 'store-a');
  const scopedState = toggleStoresMapWorkdaySelection(defaultState, 'wd-mon');
  assert.equal(
    filterStoresMapItemsByWorkdayState({
      assignmentIndex,
      items: searchScoped,
      state: scopedState,
    }).length,
    1,
  );

  const hiddenSelection = filterStoresMapItemsByWorkdayState({
    assignmentIndex,
    items: [],
    state: toggleStoresMapWorkdaySelection(defaultState, 'wd-mon'),
  });
  assert.equal(hiddenSelection.length, 0);

  const sanitized = sanitizeStoresMapWorkdayFilterState(
    {
      selectedWorkdayIds: ['wd-mon', 'wd-deleted'],
      includeUnassigned: true,
    },
    new Set(['wd-mon']),
  );
  assert.deepEqual(sanitized.selectedWorkdayIds, ['wd-mon']);

  const summary = formatStoresMapWorkdayFilterSummary({
    state: { selectedWorkdayIds: ['wd-mon', 'wd-tue'], includeUnassigned: false },
    templatesById,
    visibleStoreCount: 18,
  });
  assert.equal(summary, 'Monday + Tuesday · 18 stores');

  const allSummary = formatStoresMapWorkdayFilterSummary({
    state: defaultState,
    templatesById,
    visibleStoreCount: 6,
  });
  assert.equal(allSummary, 'All · 6 stores');

  console.log('stores-map-workday-filter-state tests passed');
}

runTests();
