import type { WorkdayMapColorKey } from '@/utils/workday-map-colors';

/** Optional accent for group chips (not used on map markers). */
export type StoreGroupColorKey = WorkdayMapColorKey;

export type StoreGroup = {
  id: string;
  name: string;
  storeIds: string[];
  colorKey?: StoreGroupColorKey;
  createdAt: string;
  updatedAt: string;
};

export function createStoreGroupId(): string {
  return `store-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
