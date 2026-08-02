import type { StoreGroup } from '@/types/store-group';
import type { WorkdayTemplate } from '@/types/workday-template';
import type { StoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import type { StoresMapScopeItem } from '@/utils/stores-map-model';
import {
  clearStoresMapWorkdayFilters,
  createDefaultStoresMapWorkdayFilterState,
  filterStoresMapItemsByWorkdayState,
  isStoresMapWorkdayFilterShowingAll,
  sanitizeStoresMapWorkdayFilterState,
  storeMatchesWorkdayFilterState,
  toggleStoresMapUnassignedFilter,
  toggleStoresMapWorkdaySelection,
  type StoresMapWorkdayFilterState,
} from '@/utils/stores-map-workday-filter-state';
import {
  storeMatchesSmartFilters,
  type StoresMapSmartFilterId,
  type StoresMapSmartFilterIndex,
} from '@/utils/stores-map-smart-filter-index';

export type StoresMapFilterState = {
  enabledSmartFilters: StoresMapSmartFilterId[];
  includeUnassigned: boolean;
  selectedStoreGroupIds: string[];
  selectedWorkdayIds: string[];
};

export function createDefaultStoresMapFilterState(): StoresMapFilterState {
  return {
    ...createDefaultStoresMapWorkdayFilterState(),
    enabledSmartFilters: [],
    selectedStoreGroupIds: [],
  };
}

export function toWorkdayFilterState(state: StoresMapFilterState): StoresMapWorkdayFilterState {
  return {
    includeUnassigned: state.includeUnassigned,
    selectedWorkdayIds: state.selectedWorkdayIds,
  };
}

export function clearStoresMapWorkdayFilterSelections(
  state: StoresMapFilterState,
): StoresMapFilterState {
  return {
    ...state,
    ...clearStoresMapWorkdayFilters(),
  };
}

export function clearAllStoresMapFilters(): StoresMapFilterState {
  return createDefaultStoresMapFilterState();
}

export function isStoresMapGroupFilterActive(state: StoresMapFilterState): boolean {
  return state.selectedStoreGroupIds.length > 0;
}

export function isStoresMapSmartFilterActive(state: StoresMapFilterState): boolean {
  return state.enabledSmartFilters.length > 0;
}

export function toggleStoresMapSmartFilter(
  state: StoresMapFilterState,
  filterId: StoresMapSmartFilterId,
): StoresMapFilterState {
  const enabled = new Set(state.enabledSmartFilters);

  if (enabled.has(filterId)) {
    enabled.delete(filterId);
  } else {
    enabled.add(filterId);
  }

  return {
    ...state,
    enabledSmartFilters: [...enabled].sort(),
  };
}

export function toggleStoresMapStoreGroupSelection(
  state: StoresMapFilterState,
  groupId: string,
): StoresMapFilterState {
  const selected = new Set(state.selectedStoreGroupIds);

  if (selected.has(groupId)) {
    selected.delete(groupId);
  } else {
    selected.add(groupId);
  }

  return {
    ...state,
    selectedStoreGroupIds: [...selected].sort(),
  };
}

export function sanitizeStoresMapFilterState(input: {
  availableGroupIds: ReadonlySet<string>;
  availableTemplateIds: ReadonlySet<string>;
  state: StoresMapFilterState;
}): StoresMapFilterState {
  const workdaySanitized = sanitizeStoresMapWorkdayFilterState(
    toWorkdayFilterState(input.state),
    input.availableTemplateIds,
  );
  const nextGroupIds = input.state.selectedStoreGroupIds.filter((id) =>
    input.availableGroupIds.has(id),
  );
  const enabledSmartFilters = input.state.enabledSmartFilters.filter((id) =>
    ['delivery_soon', 'missed_delivery', 'no_visit_7d', 'no_delivery_7d'].includes(id),
  );

  if (
    workdaySanitized.selectedWorkdayIds.join(',') ===
      input.state.selectedWorkdayIds.join(',') &&
    workdaySanitized.includeUnassigned === input.state.includeUnassigned &&
    nextGroupIds.join(',') === input.state.selectedStoreGroupIds.join(',') &&
    enabledSmartFilters.join(',') === input.state.enabledSmartFilters.join(',')
  ) {
    return input.state;
  }

  return {
    enabledSmartFilters,
    includeUnassigned: workdaySanitized.includeUnassigned,
    selectedStoreGroupIds: nextGroupIds,
    selectedWorkdayIds: workdaySanitized.selectedWorkdayIds,
  };
}

export function storeMatchesStoreGroupFilterState(input: {
  groupsById: Map<string, StoreGroup>;
  state: StoresMapFilterState;
  storeId: string;
}): boolean {
  if (input.state.selectedStoreGroupIds.length === 0) {
    return true;
  }

  return input.state.selectedStoreGroupIds.some((groupId) => {
    const group = input.groupsById.get(groupId);

    return group?.storeIds.includes(input.storeId) ?? false;
  });
}

export function filterStoresMapItems(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  groupsById: Map<string, StoreGroup>;
  items: StoresMapScopeItem[];
  smartFilterIndex: StoresMapSmartFilterIndex;
  state: StoresMapFilterState;
}): StoresMapScopeItem[] {
  let filtered = filterStoresMapItemsByWorkdayState({
    assignmentIndex: input.assignmentIndex,
    items: input.items,
    state: toWorkdayFilterState(input.state),
  });

  if (isStoresMapGroupFilterActive(input.state)) {
    filtered = filtered.filter((item) =>
      storeMatchesStoreGroupFilterState({
        groupsById: input.groupsById,
        state: input.state,
        storeId: item.store.id,
      }),
    );
  }

  if (isStoresMapSmartFilterActive(input.state)) {
    filtered = filtered.filter((item) =>
      storeMatchesSmartFilters({
        enabledSmartFilters: input.state.enabledSmartFilters,
        index: input.smartFilterIndex,
        storeId: item.store.id,
      }),
    );
  }

  return filtered;
}

export function applyStoresMapFilterChipPress(input: {
  chipFilterId: string;
  state: StoresMapFilterState;
}): StoresMapFilterState {
  if (input.chipFilterId === 'all') {
    return clearStoresMapWorkdayFilterSelections(input.state);
  }

  if (input.chipFilterId === 'unassigned') {
    return {
      ...input.state,
      ...toggleStoresMapUnassignedFilter(toWorkdayFilterState(input.state)),
    };
  }

  if (input.chipFilterId.startsWith('workday:')) {
    const templateId = input.chipFilterId.replace(/^workday:/, '');

    return {
      ...input.state,
      ...toggleStoresMapWorkdaySelection(toWorkdayFilterState(input.state), templateId),
    };
  }

  if (input.chipFilterId.startsWith('group:')) {
    const groupId = input.chipFilterId.replace(/^group:/, '');

    return toggleStoresMapStoreGroupSelection(input.state, groupId);
  }

  if (input.chipFilterId.startsWith('smart:')) {
    const filterId = input.chipFilterId.replace(/^smart:/, '') as StoresMapSmartFilterId;

    return toggleStoresMapSmartFilter(input.state, filterId);
  }

  return input.state;
}

export function isStoresMapFilterChipSelected(input: {
  chipFilterId: string;
  state: StoresMapFilterState;
}): boolean {
  if (input.chipFilterId === 'all') {
    return isStoresMapWorkdayFilterShowingAll(toWorkdayFilterState(input.state));
  }

  if (input.chipFilterId === 'unassigned') {
    return input.state.includeUnassigned;
  }

  if (input.chipFilterId.startsWith('workday:')) {
    const templateId = input.chipFilterId.replace(/^workday:/, '');

    return input.state.selectedWorkdayIds.includes(templateId);
  }

  if (input.chipFilterId.startsWith('group:')) {
    const groupId = input.chipFilterId.replace(/^group:/, '');

    return input.state.selectedStoreGroupIds.includes(groupId);
  }

  if (input.chipFilterId.startsWith('smart:')) {
    const filterId = input.chipFilterId.replace(/^smart:/, '') as StoresMapSmartFilterId;

    return input.state.enabledSmartFilters.includes(filterId);
  }

  return false;
}

export function countActiveStoresMapFilterCategories(state: StoresMapFilterState): number {
  let count = 0;

  if (!isStoresMapWorkdayFilterShowingAll(toWorkdayFilterState(state))) {
    count += 1;
  }

  if (isStoresMapGroupFilterActive(state)) {
    count += 1;
  }

  if (isStoresMapSmartFilterActive(state)) {
    count += 1;
  }

  return count;
}

/** One-line collapsed sheet title matching approved mockup (“All Stores · 36”). */
export function formatStoresMapSheetCollapsedPrimaryLine(input: {
  groupsById: Map<string, StoreGroup>;
  scopeLabel: 'Today' | 'All Stores';
  state: StoresMapFilterState;
  templatesById: Map<string, WorkdayTemplate>;
  visibleStoreCount: number;
}): string {
  const count = input.visibleStoreCount;
  const categoryCount = countActiveStoresMapFilterCategories(input.state);

  if (categoryCount === 0) {
    return `${input.scopeLabel} · ${count}`;
  }

  const workdayNames = input.state.selectedWorkdayIds
    .map((id) => input.templatesById.get(id)?.name.trim())
    .filter((name): name is string => Boolean(name && name.length > 0));

  if (
    categoryCount === 1 &&
    workdayNames.length > 0 &&
    !isStoresMapGroupFilterActive(input.state) &&
    !isStoresMapSmartFilterActive(input.state)
  ) {
    if (workdayNames.length === 1) {
      return `${workdayNames[0]} · ${count}`;
    }

    return `${workdayNames.length} Workdays · ${count}`;
  }

  if (categoryCount >= 2) {
    return `${categoryCount} filters · ${count}`;
  }

  if (input.state.selectedStoreGroupIds.length === 1) {
    const group = input.groupsById.get(input.state.selectedStoreGroupIds[0]!);

    if (group?.name) {
      return `${group.name} · ${count}`;
    }
  }

  if (input.state.enabledSmartFilters.length === 1) {
    const id = input.state.enabledSmartFilters[0]!;
    const label =
      id === 'no_visit_7d'
        ? 'No Visit 7+'
        : id === 'no_delivery_7d'
          ? 'No Delivery 7+'
          : id === 'missed_delivery'
            ? 'Missed'
            : 'Delivery Soon';

    return `${label} · ${count}`;
  }

  return `${input.scopeLabel} · ${count}`;
}

export function formatStoresMapFilterSummary(input: {
  groupsById: Map<string, StoreGroup>;
  scopeLabel: 'Today' | 'All Stores';
  state: StoresMapFilterState;
  templatesById: Map<string, WorkdayTemplate>;
  visibleStoreCount: number;
}): string {
  const countLabel = `${input.visibleStoreCount} store${input.visibleStoreCount === 1 ? '' : 's'}`;
  const categoryCount = countActiveStoresMapFilterCategories(input.state);

  if (categoryCount >= 3) {
    return `${input.scopeLabel} · ${categoryCount} filters · ${countLabel}`;
  }

  const parts: string[] = [];

  if (!isStoresMapWorkdayFilterShowingAll(toWorkdayFilterState(input.state))) {
    const workdayNames = input.state.selectedWorkdayIds
      .map((id) => input.templatesById.get(id)?.name.trim())
      .filter((name): name is string => Boolean(name && name.length > 0));

    if (workdayNames.length > 0) {
      parts.push(workdayNames.join(' + '));
    }

    if (input.state.includeUnassigned) {
      parts.push('Unassigned');
    }
  }

  if (input.state.selectedStoreGroupIds.length === 1) {
    const group = input.groupsById.get(input.state.selectedStoreGroupIds[0]!);
    if (group?.name) {
      parts.push(group.name);
    }
  } else if (input.state.selectedStoreGroupIds.length > 1) {
    parts.push(`${input.state.selectedStoreGroupIds.length} groups`);
  }

  if (input.state.enabledSmartFilters.length === 1) {
    const id = input.state.enabledSmartFilters[0]!;
    parts.push(
      id === 'no_visit_7d'
        ? 'No visit 7+ days'
        : id === 'no_delivery_7d'
          ? 'No delivery 7+ days'
          : id === 'missed_delivery'
            ? 'Missed delivery'
            : 'Delivery soon',
    );
  } else if (input.state.enabledSmartFilters.length > 1) {
    parts.push(`${input.state.enabledSmartFilters.length} smart filters`);
  }

  if (parts.length === 0) {
    return `${input.scopeLabel} · ${countLabel}`;
  }

  if (categoryCount >= 2 && parts.length >= 2) {
    return `${parts.slice(0, 2).join(' · ')} · ${countLabel}`;
  }

  return `${parts.join(' · ')} · ${countLabel}`;
}

export {
  storeMatchesWorkdayFilterState,
  toggleStoresMapWorkdaySelection,
  toggleStoresMapUnassignedFilter,
  computeStoresMapWorkdayFilterKey,
} from '@/utils/stores-map-workday-filter-state';
