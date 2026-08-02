import AsyncStorage from '@react-native-async-storage/async-storage';

import { createStoreGroupId, type StoreGroup } from '@/types/store-group';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { getStores } from '@/services/stores';
import {
  normalizeStoreGroupMemberships,
  sanitizeStoreGroup,
} from '@/utils/store-group-persistence';

export const STORE_GROUPS_STORAGE_KEY = '@milemate/store-groups';

let groupsStorageOverride: StoreGroup[] | null = null;

async function readStoreGroupsRaw(): Promise<StoreGroup[]> {
  if (groupsStorageOverride) {
    return [...groupsStorageOverride];
  }

  const stored = await AsyncStorage.getItem(STORE_GROUPS_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeStoreGroup(entry))
      .filter((entry): entry is StoreGroup => entry !== null);
  } catch {
    return [];
  }
}

async function writeStoreGroups(groups: StoreGroup[]): Promise<void> {
  if (groupsStorageOverride) {
    groupsStorageOverride = [...groups];
    return;
  }

  await AsyncStorage.setItem(STORE_GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

async function readStoreGroupsNormalized(): Promise<StoreGroup[]> {
  const [groups, stores, remap] = await Promise.all([
    readStoreGroupsRaw(),
    getStores(),
    getStoreImportIdRemap(),
  ]);
  const validStoreIds = new Set(stores.map((store) => store.id));
  const normalized = normalizeStoreGroupMemberships({
    groups,
    storeIdRemap: remap,
    validStoreIds,
  });
  const changed = normalized.some(
    (group, index) => group.storeIds.join(',') !== groups[index]?.storeIds.join(','),
  );

  if (changed) {
    await writeStoreGroups(normalized);
  }

  return normalized.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getStoreGroups(): Promise<StoreGroup[]> {
  return readStoreGroupsNormalized();
}

export async function createStoreGroup(input: {
  colorKey?: StoreGroup['colorKey'];
  name: string;
  storeIds?: string[];
}): Promise<StoreGroup> {
  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error('Group name is required');
  }

  const now = new Date().toISOString();
  const group: StoreGroup = {
    colorKey: input.colorKey,
    createdAt: now,
    id: createStoreGroupId(),
    name,
    storeIds: input.storeIds ? [...new Set(input.storeIds)] : [],
    updatedAt: now,
  };

  const groups = await readStoreGroupsNormalized();
  await writeStoreGroups([group, ...groups]);

  return group;
}

export async function updateStoreGroup(
  groupId: string,
  input: {
    colorKey?: StoreGroup['colorKey'];
    name?: string;
    storeIds?: string[];
  },
): Promise<StoreGroup> {
  const groups = await readStoreGroupsNormalized();
  const index = groups.findIndex((group) => group.id === groupId);

  if (index === -1) {
    throw new Error('Store group not found');
  }

  const existing = groups[index]!;
  const next: StoreGroup = {
    ...existing,
    colorKey: input.colorKey ?? existing.colorKey,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    storeIds:
      input.storeIds !== undefined ? [...new Set(input.storeIds)] : existing.storeIds,
    updatedAt: new Date().toISOString(),
  };

  if (next.name.length === 0) {
    throw new Error('Group name is required');
  }

  const updated = [...groups];
  updated[index] = next;
  await writeStoreGroups(updated);

  return next;
}

export async function deleteStoreGroup(groupId: string): Promise<boolean> {
  const groups = await readStoreGroupsNormalized();
  const next = groups.filter((group) => group.id !== groupId);

  if (next.length === groups.length) {
    return false;
  }

  await writeStoreGroups(next);

  return true;
}

export async function addStoresToGroup(
  groupId: string,
  storeIds: string[],
): Promise<StoreGroup> {
  const groups = await readStoreGroupsNormalized();
  const group = groups.find((entry) => entry.id === groupId);

  if (!group) {
    throw new Error('Store group not found');
  }

  const merged = [...new Set([...group.storeIds, ...storeIds])];

  return updateStoreGroup(groupId, { storeIds: merged });
}

export async function removeStoresFromGroup(
  groupId: string,
  storeIds: string[],
): Promise<StoreGroup> {
  const toRemove = new Set(storeIds);
  const groups = await readStoreGroupsNormalized();
  const group = groups.find((entry) => entry.id === groupId);

  if (!group) {
    throw new Error('Store group not found');
  }

  const nextIds = group.storeIds.filter((id) => !toRemove.has(id));

  return updateStoreGroup(groupId, { storeIds: nextIds });
}

export async function removeStoreFromAllGroups(storeId: string): Promise<void> {
  const groups = await readStoreGroupsRaw();
  let changed = false;
  const next = groups.map((group) => {
    if (!group.storeIds.includes(storeId)) {
      return group;
    }

    changed = true;

    return {
      ...group,
      storeIds: group.storeIds.filter((id) => id !== storeId),
      updatedAt: new Date().toISOString(),
    };
  });

  if (changed) {
    await writeStoreGroups(next);
  }
}

export function __setStoreGroupsStorageForTests(groups: StoreGroup[]): void {
  groupsStorageOverride = [...groups];
}

export function __resetStoreGroupsStorageForTests(): void {
  groupsStorageOverride = null;
}
