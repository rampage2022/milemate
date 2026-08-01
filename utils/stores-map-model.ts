import type { Region } from 'react-native-maps';

import type { Store } from '@/types/store';
import { formatStoreAddress } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { WorkdayTemplate } from '@/types/workday-template';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import type { StoreWorkdayAssignmentIndex } from '@/utils/store-workday-assignment-index';
import {
  computeRouteMapInitialRegion,
  ROUTE_MAP_FIT_EDGE_PADDING,
  type MapLatLng,
} from '@/utils/route-map-utils';
import {
  getWorkdayMapColorStyle,
  isWorkdayMapColorKey,
  UNASSIGNED_STORE_MAP_STYLE,
  type WorkdayMapColorStyle,
} from '@/utils/workday-map-colors';

export type StoresMapWorkdayFilter = 'all' | 'unassigned' | `workday:${string}`;

export type StoresMapScopeItem = {
  store: Store;
  visit: StoreVisit | null;
};

export type StoresMapMarkerModel = {
  accessibilityLabel: string;
  latitude: number;
  longitude: number;
  markerBackground: string;
  markerForeground: string;
  pinAbbreviation: string;
  storeId: string;
};

export type StoresMapPreviewWorkdayRow = {
  isPrimary: boolean;
  name: string;
  templateId: string;
};

export type StoresMapPreviewModel = {
  address: string;
  membershipRows: StoresMapPreviewWorkdayRow[];
  primaryWorkdayLabel: string;
  store: Store;
  storeNumberLabel: string | null;
  visit: StoreVisit | null;
};

export type StoresMapFilterChipModel = {
  accessibilityLabel: string;
  colorStyle: WorkdayMapColorStyle;
  filterId: StoresMapWorkdayFilter;
  label: string;
};

export type StoresMapCounts = {
  missingLocation: number;
  onMap: number;
  total: number;
};

export type StoresMapEmptyKind = 'none' | 'no_stores_in_scope' | 'no_mappable_stores';

export type StoresMapModel = {
  counts: StoresMapCounts;
  emptyKind: StoresMapEmptyKind;
  filterChips: StoresMapFilterChipModel[];
  fitCoordinates: MapLatLng[];
  fitRegion: Region;
  fitRegionKey: string;
  markers: StoresMapMarkerModel[];
  missingLocationStores: Store[];
  previewByStoreId: Record<string, StoresMapPreviewModel>;
};

export type BuildStoresMapModelInput = {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  items: StoresMapScopeItem[];
  templates: WorkdayTemplate[];
  workdayFilter: StoresMapWorkdayFilter;
};

const SINGLE_STORE_REGION_DELTA = {
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const DEFAULT_FALLBACK_REGION: Region = {
  latitude: 32.7767,
  longitude: -96.797,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

export function storeHasMappableCoordinates(store: Store): boolean {
  return (
    typeof store.latitude === 'number' &&
    typeof store.longitude === 'number' &&
    Number.isFinite(store.latitude) &&
    Number.isFinite(store.longitude)
  );
}

function templatesByIdMap(templates: WorkdayTemplate[]): Map<string, WorkdayTemplate> {
  return new Map(templates.map((template) => [template.id, template]));
}

function resolveWorkdayNamesForStore(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  storeId: string;
  templatesById: Map<string, WorkdayTemplate>;
}): { names: string[]; primaryTemplateId: string | null } {
  const assignment = input.assignmentIndex?.byStoreId.get(input.storeId);

  if (!assignment || assignment.workdayIds.length === 0) {
    return { names: [], primaryTemplateId: null };
  }

  const names = assignment.workdayIds
    .map((id) => input.templatesById.get(id)?.name.trim())
    .filter((name): name is string => Boolean(name && name.length > 0));

  return {
    names,
    primaryTemplateId: assignment.primaryWorkdayId ?? assignment.workdayIds[0] ?? null,
  };
}

export function buildStoreMarkerAccessibilityLabel(input: {
  store: Store;
  workdayNames: string[];
}): string {
  const name = getStoreDisplayName(input.store);

  if (input.workdayNames.length === 0) {
    return `${name}, unassigned`;
  }

  if (input.workdayNames.length === 1) {
    return `${name}, assigned to ${input.workdayNames[0]}`;
  }

  if (input.workdayNames.length === 2) {
    return `${name}, assigned to ${input.workdayNames[0]} and ${input.workdayNames[1]}`;
  }

  return `${name}, assigned to ${input.workdayNames[0]} and ${input.workdayNames.length - 1} more workdays`;
}

function deriveUnassignedPinAbbreviation(store: Store): string {
  const name = getStoreDisplayName(store).trim();

  if (name.length === 0) {
    return '•';
  }

  return name.slice(0, 1).toUpperCase();
}

function resolveMarkerStyleForStore(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  store: Store;
  templatesById: Map<string, WorkdayTemplate>;
}): Pick<
  StoresMapMarkerModel,
  'markerBackground' | 'markerForeground' | 'pinAbbreviation'
> {
  const { names, primaryTemplateId } = resolveWorkdayNamesForStore({
    assignmentIndex: input.assignmentIndex,
    storeId: input.store.id,
    templatesById: input.templatesById,
  });

  if (!primaryTemplateId || names.length === 0) {
    return {
      markerBackground: UNASSIGNED_STORE_MAP_STYLE.markerBackground,
      markerForeground: UNASSIGNED_STORE_MAP_STYLE.markerForeground,
      pinAbbreviation: deriveUnassignedPinAbbreviation(input.store),
    };
  }

  const primaryTemplate = input.templatesById.get(primaryTemplateId);
  const colorKey = primaryTemplate?.mapColorKey;

  if (!colorKey || !isWorkdayMapColorKey(colorKey)) {
    return {
      markerBackground: UNASSIGNED_STORE_MAP_STYLE.markerBackground,
      markerForeground: UNASSIGNED_STORE_MAP_STYLE.markerForeground,
      pinAbbreviation: deriveUnassignedPinAbbreviation(input.store),
    };
  }

  const colorStyle = getWorkdayMapColorStyle(colorKey);
  const abbreviation =
    primaryTemplate?.pinAbbreviation?.trim().slice(0, 2) ||
    deriveUnassignedPinAbbreviation(input.store);

  return {
    markerBackground: colorStyle.markerBackground,
    markerForeground: colorStyle.markerForeground,
    pinAbbreviation: abbreviation,
  };
}

export function filterStoresMapItemsByWorkday(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  items: StoresMapScopeItem[];
  workdayFilter: StoresMapWorkdayFilter;
}): StoresMapScopeItem[] {
  if (input.workdayFilter === 'all') {
    return input.items;
  }

  if (input.workdayFilter === 'unassigned') {
    return input.items.filter((item) => {
      const assignment = input.assignmentIndex?.byStoreId.get(item.store.id);

      return !assignment || assignment.workdayIds.length === 0;
    });
  }

  const templateId = input.workdayFilter.replace(/^workday:/, '');

  return input.items.filter((item) => {
    const assignment = input.assignmentIndex?.byStoreId.get(item.store.id);

    return assignment?.workdayIds.includes(templateId) ?? false;
  });
}

export function buildStoresMapFilterChips(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  items: StoresMapScopeItem[];
  templates: WorkdayTemplate[];
}): StoresMapFilterChipModel[] {
  const templatesById = templatesByIdMap(input.templates);
  const representedTemplateIds = new Set<string>();

  for (const item of input.items) {
    const assignment = input.assignmentIndex?.byStoreId.get(item.store.id);

    if (!assignment) {
      continue;
    }

    for (const workdayId of assignment.workdayIds) {
      representedTemplateIds.add(workdayId);
    }
  }

  const workdayChips = [...representedTemplateIds]
    .map((templateId) => templatesById.get(templateId))
    .filter((template): template is WorkdayTemplate => template !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((template) => {
      const colorKey =
        template.mapColorKey && isWorkdayMapColorKey(template.mapColorKey)
          ? template.mapColorKey
          : 'blue';
      const colorStyle = getWorkdayMapColorStyle(colorKey);

      return {
        accessibilityLabel: `Filter by ${template.name} workday`,
        colorStyle,
        filterId: `workday:${template.id}` as StoresMapWorkdayFilter,
        label: template.name,
      };
    });

  const hasUnassigned = input.items.some((item) => {
    const assignment = input.assignmentIndex?.byStoreId.get(item.store.id);

    return !assignment || assignment.workdayIds.length === 0;
  });

  const chips: StoresMapFilterChipModel[] = [
    {
      accessibilityLabel: 'Show all stores in this view',
      colorStyle: UNASSIGNED_STORE_MAP_STYLE,
      filterId: 'all',
      label: 'All',
    },
  ];

  if (hasUnassigned) {
    chips.push({
      accessibilityLabel: 'Show unassigned stores',
      colorStyle: UNASSIGNED_STORE_MAP_STYLE,
      filterId: 'unassigned',
      label: 'Unassigned',
    });
  }

  return [...chips, ...workdayChips];
}

export function computeStoresMapFitRegion(coordinates: MapLatLng[]): Region {
  if (coordinates.length === 0) {
    return DEFAULT_FALLBACK_REGION;
  }

  if (coordinates.length === 1) {
    const point = coordinates[0]!;

    return {
      latitude: point.latitude,
      longitude: point.longitude,
      latitudeDelta: SINGLE_STORE_REGION_DELTA.latitudeDelta,
      longitudeDelta: SINGLE_STORE_REGION_DELTA.longitudeDelta,
    };
  }

  return computeRouteMapInitialRegion(coordinates, { planningOverview: true });
}

export function computeStoresMapFitRegionKey(input: {
  filter: StoresMapWorkdayFilter;
  markerStoreIds: string[];
}): string {
  return `${input.filter}|${[...input.markerStoreIds].sort().join(',')}`;
}

export function buildStoresMapPreviewModel(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex | null;
  item: StoresMapScopeItem;
  templatesById: Map<string, WorkdayTemplate>;
}): StoresMapPreviewModel {
  const { store, visit } = input.item;
  const assignment = input.assignmentIndex?.byStoreId.get(store.id);
  const workdayIds = assignment?.workdayIds ?? [];
  const primaryId = assignment?.primaryWorkdayId ?? workdayIds[0] ?? null;

  const membershipRows = workdayIds
    .map((templateId) => {
      const template = input.templatesById.get(templateId);

      if (!template) {
        return null;
      }

      return {
        isPrimary: templateId === primaryId,
        name: template.name,
        templateId,
      };
    })
    .filter((row): row is StoresMapPreviewWorkdayRow => row !== null);

  const primaryTemplate = primaryId ? input.templatesById.get(primaryId) : undefined;
  const primaryWorkdayLabel = primaryTemplate?.name?.trim() || 'Unassigned';

  const storeNumberLabel =
    store.storeNumber && store.storeNumber.trim().length > 0
      ? `#${store.storeNumber.trim()}`
      : null;

  return {
    address: formatStoreAddress(store),
    membershipRows,
    primaryWorkdayLabel: membershipRows.length > 0 ? primaryWorkdayLabel : 'Unassigned',
    store,
    storeNumberLabel,
    visit,
  };
}

export function buildStoresMapModel(input: BuildStoresMapModelInput): StoresMapModel {
  const templatesById = templatesByIdMap(input.templates);
  const filteredItems = filterStoresMapItemsByWorkday({
    assignmentIndex: input.assignmentIndex,
    items: input.items,
    workdayFilter: input.workdayFilter,
  });

  const missingLocationStores: Store[] = [];
  const markers: StoresMapMarkerModel[] = [];
  const previewByStoreId: Record<string, StoresMapPreviewModel> = {};

  for (const item of filteredItems) {
    previewByStoreId[item.store.id] = buildStoresMapPreviewModel({
      assignmentIndex: input.assignmentIndex,
      item,
      templatesById,
    });

    if (!storeHasMappableCoordinates(item.store)) {
      missingLocationStores.push(item.store);
      continue;
    }

    const { names } = resolveWorkdayNamesForStore({
      assignmentIndex: input.assignmentIndex,
      storeId: item.store.id,
      templatesById,
    });
    const markerStyle = resolveMarkerStyleForStore({
      assignmentIndex: input.assignmentIndex,
      store: item.store,
      templatesById,
    });

    markers.push({
      accessibilityLabel: buildStoreMarkerAccessibilityLabel({
        store: item.store,
        workdayNames: names,
      }),
      latitude: item.store.latitude!,
      longitude: item.store.longitude!,
      ...markerStyle,
      storeId: item.store.id,
    });
  }

  const fitCoordinates = markers.map((marker) => ({
    latitude: marker.latitude,
    longitude: marker.longitude,
  }));

  const counts: StoresMapCounts = {
    missingLocation: missingLocationStores.length,
    onMap: markers.length,
    total: filteredItems.length,
  };

  let emptyKind: StoresMapEmptyKind = 'none';

  if (filteredItems.length === 0) {
    emptyKind = 'no_stores_in_scope';
  } else if (markers.length === 0) {
    emptyKind = 'no_mappable_stores';
  }

  return {
    counts,
    emptyKind,
    filterChips: buildStoresMapFilterChips({
      assignmentIndex: input.assignmentIndex,
      items: input.items,
      templates: input.templates,
    }),
    fitCoordinates,
    fitRegion: computeStoresMapFitRegion(fitCoordinates),
    fitRegionKey: computeStoresMapFitRegionKey({
      filter: input.workdayFilter,
      markerStoreIds: markers.map((marker) => marker.storeId),
    }),
    markers,
    missingLocationStores,
    previewByStoreId,
  };
}

export { ROUTE_MAP_FIT_EDGE_PADDING };
