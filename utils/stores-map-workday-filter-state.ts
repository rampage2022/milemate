import type { WorkdayTemplate } from '@/types/workday-template';
import type { StoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import type { StoresMapScopeItem } from '@/utils/stores-map-model';

export type StoresMapWorkdayFilterState = {
  includeUnassigned: boolean;
  selectedWorkdayIds: string[];
};

export function createDefaultStoresMapWorkdayFilterState(): StoresMapWorkdayFilterState {
  return {
    includeUnassigned: false,
    selectedWorkdayIds: [],
  };
}

export function isStoresMapWorkdayFilterShowingAll(
  state: StoresMapWorkdayFilterState,
): boolean {
  return state.selectedWorkdayIds.length === 0 && !state.includeUnassigned;
}

export function clearStoresMapWorkdayFilters(): StoresMapWorkdayFilterState {
  return createDefaultStoresMapWorkdayFilterState();
}

export function toggleStoresMapWorkdaySelection(
  state: StoresMapWorkdayFilterState,
  templateId: string,
): StoresMapWorkdayFilterState {
  const selected = new Set(state.selectedWorkdayIds);

  if (selected.has(templateId)) {
    selected.delete(templateId);
  } else {
    selected.add(templateId);
  }

  return {
    ...state,
    selectedWorkdayIds: [...selected].sort(),
  };
}

export function toggleStoresMapUnassignedFilter(
  state: StoresMapWorkdayFilterState,
): StoresMapWorkdayFilterState {
  return {
    ...state,
    includeUnassigned: !state.includeUnassigned,
  };
}

export function sanitizeStoresMapWorkdayFilterState(
  state: StoresMapWorkdayFilterState,
  availableTemplateIds: ReadonlySet<string>,
): StoresMapWorkdayFilterState {
  const nextSelected = state.selectedWorkdayIds.filter((id) =>
    availableTemplateIds.has(id),
  );

  if (
    nextSelected.length === state.selectedWorkdayIds.length &&
    nextSelected.every((id, index) => id === state.selectedWorkdayIds[index])
  ) {
    return state;
  }

  return {
    includeUnassigned: state.includeUnassigned,
    selectedWorkdayIds: nextSelected,
  };
}

export function storeMatchesWorkdayFilterState(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  item: StoresMapScopeItem;
  state: StoresMapWorkdayFilterState;
}): boolean {
  if (isStoresMapWorkdayFilterShowingAll(input.state)) {
    return true;
  }

  const assignment = input.assignmentIndex?.byStoreId.get(input.item.store.id);
  const workdayIds = assignment?.workdayIds ?? [];
  const isUnassigned = workdayIds.length === 0;

  const matchesWorkday = input.state.selectedWorkdayIds.some((templateId) =>
    workdayIds.includes(templateId),
  );
  const matchesUnassigned = input.state.includeUnassigned && isUnassigned;

  return matchesWorkday || matchesUnassigned;
}

export function filterStoresMapItemsByWorkdayState(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  items: StoresMapScopeItem[];
  state: StoresMapWorkdayFilterState;
}): StoresMapScopeItem[] {
  if (isStoresMapWorkdayFilterShowingAll(input.state)) {
    return input.items;
  }

  return input.items.filter((item) =>
    storeMatchesWorkdayFilterState({
      assignmentIndex: input.assignmentIndex,
      item,
      state: input.state,
    }),
  );
}

export function computeStoresMapWorkdayFilterKey(state: StoresMapWorkdayFilterState): string {
  const ids = [...state.selectedWorkdayIds].sort().join(',');

  return `${ids}|${state.includeUnassigned ? '1' : '0'}`;
}

export function formatStoresMapWorkdayFilterSummary(input: {
  state: StoresMapWorkdayFilterState;
  templatesById: Map<string, WorkdayTemplate>;
  visibleStoreCount: number;
}): string {
  const countLabel = `${input.visibleStoreCount} store${input.visibleStoreCount === 1 ? '' : 's'}`;

  if (isStoresMapWorkdayFilterShowingAll(input.state)) {
    return `All · ${countLabel}`;
  }

  const names = input.state.selectedWorkdayIds
    .map((id) => input.templatesById.get(id)?.name.trim())
    .filter((name): name is string => Boolean(name && name.length > 0));

  const parts: string[] = [];

  if (names.length > 0) {
    parts.push(names.join(' + '));
  }

  if (input.state.includeUnassigned) {
    parts.push('Unassigned');
  }

  if (parts.length === 0) {
    return `All · ${countLabel}`;
  }

  return `${parts.join(' + ')} · ${countLabel}`;
}

export function applyStoresMapWorkdayFilterChipPress(input: {
  chipFilterId: string;
  state: StoresMapWorkdayFilterState;
}): StoresMapWorkdayFilterState {
  if (input.chipFilterId === 'all') {
    return clearStoresMapWorkdayFilters();
  }

  if (input.chipFilterId === 'unassigned') {
    return toggleStoresMapUnassignedFilter(input.state);
  }

  if (input.chipFilterId.startsWith('workday:')) {
    const templateId = input.chipFilterId.replace(/^workday:/, '');

    return toggleStoresMapWorkdaySelection(input.state, templateId);
  }

  return input.state;
}

export function isStoresMapWorkdayChipSelected(input: {
  chipFilterId: string;
  state: StoresMapWorkdayFilterState;
}): boolean {
  if (input.chipFilterId === 'all') {
    return isStoresMapWorkdayFilterShowingAll(input.state);
  }

  if (input.chipFilterId === 'unassigned') {
    return input.state.includeUnassigned;
  }

  if (input.chipFilterId.startsWith('workday:')) {
    const templateId = input.chipFilterId.replace(/^workday:/, '');

    return input.state.selectedWorkdayIds.includes(templateId);
  }

  return false;
}
