import type { StoreGroup } from '@/types/store-group';
import { isWorkdayMapColorKey } from '@/utils/workday-map-colors';

export function sanitizeStoreGroup(value: unknown): StoreGroup | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.id !== 'string' || typeof record.name !== 'string') {
    return null;
  }

  if (!Array.isArray(record.storeIds)) {
    return null;
  }

  const storeIds = record.storeIds.filter((id): id is string => typeof id === 'string');

  if (typeof record.createdAt !== 'string' || typeof record.updatedAt !== 'string') {
    return null;
  }

  const rawColorKey = record.colorKey;
  const colorKey =
    rawColorKey === undefined
      ? undefined
      : typeof rawColorKey === 'string' && isWorkdayMapColorKey(rawColorKey)
        ? rawColorKey
        : undefined;

  return {
    colorKey,
    createdAt: record.createdAt,
    id: record.id,
    name: record.name.trim(),
    storeIds: [...new Set(storeIds)],
    updatedAt: record.updatedAt,
  };
}

/** Remap legacy/import IDs to canonical store IDs; drop unknown stores. */
export function normalizeStoreGroupMemberships(input: {
  groups: StoreGroup[];
  storeIdRemap: ReadonlyMap<string, string>;
  validStoreIds: ReadonlySet<string>;
}): StoreGroup[] {
  return input.groups.map((group) => {
    const remapped = group.storeIds.map(
      (storeId) => input.storeIdRemap.get(storeId) ?? storeId,
    );
    const storeIds = [...new Set(remapped)].filter((id) => input.validStoreIds.has(id));

    if (
      storeIds.length === group.storeIds.length &&
      storeIds.every((id, index) => id === group.storeIds[index])
    ) {
      return group;
    }

    return {
      ...group,
      storeIds,
      updatedAt: new Date().toISOString(),
    };
  });
}
