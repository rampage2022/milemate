import type { WorkdayMapColorKey } from '@/utils/workday-map-colors';

export type { WorkdayMapColorKey };

export type WorkdayTemplateStopSourceType = 'store' | 'manual';

export type WorkdayTemplateStop = {
  id: string;
  storeId?: string;
  displayName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  sourceType?: WorkdayTemplateStopSourceType;
};

export type WorkdayTemplate = {
  id: string;
  name: string;
  stops: WorkdayTemplateStop[];
  createdAt: string;
  updatedAt: string;
  /** Named palette key for Stores map markers and filter chips. */
  mapColorKey?: WorkdayMapColorKey;
  /** 1–2 character marker label; not weekday-specific. */
  pinAbbreviation?: string;
};

export function createWorkdayTemplateId(): string {
  return `workday-template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createWorkdayTemplateStopId(): string {
  return `workday-template-stop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeWorkdayTemplateName(name: string): string {
  return name.trim();
}

export function workdayTemplateNamesMatch(left: string, right: string): boolean {
  return normalizeWorkdayTemplateName(left).localeCompare(
    normalizeWorkdayTemplateName(right),
    undefined,
    { sensitivity: 'accent' },
  ) === 0;
}
