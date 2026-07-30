import AsyncStorage from '@react-native-async-storage/async-storage';

import { getStores, upsertStore } from '@/services/stores';
import { getTodayVisits, replaceTodayVisits } from '@/services/store-visits';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  createWorkdayTemplateId,
  normalizeWorkdayTemplateName,
  workdayTemplateNamesMatch,
  type WorkdayTemplate,
  type WorkdayTemplateStop,
} from '@/types/workday-template';
import { logSaveWorkdayDev } from '@/utils/save-workday-dev-log';
import { getTodayDateString } from '@/utils/today-date';
import {
  buildWorkdayTemplateStopsFromVisits,
  createStoreFromResolvedWorkdayTemplateStop,
  createVisitFromResolvedWorkdayTemplateStop,
  resolveWorkdayTemplateStop,
  selectMissingWorkdayTemplateStops,
  type ResolvedWorkdayTemplateStop,
} from '@/utils/workday-template-utils';

export const WORKDAY_TEMPLATES_STORAGE_KEY = '@milemate/workday-templates';

function isWorkdayTemplateStop(value: unknown): value is WorkdayTemplateStop {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.displayName === 'string' &&
    typeof record.address === 'string' &&
    (record.storeId === undefined || typeof record.storeId === 'string') &&
    (record.latitude === undefined || typeof record.latitude === 'number') &&
    (record.longitude === undefined || typeof record.longitude === 'number') &&
    (record.sourceType === undefined ||
      record.sourceType === 'store' ||
      record.sourceType === 'manual')
  );
}

function isWorkdayTemplate(value: unknown): value is WorkdayTemplate {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    Array.isArray(record.stops) &&
    record.stops.every(isWorkdayTemplateStop) &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

let workdayTemplatesStorageOverride: WorkdayTemplate[] | null = null;

export function __setWorkdayTemplatesStorageForTests(
  templates: WorkdayTemplate[],
): void {
  workdayTemplatesStorageOverride = [...templates];
}

export function __resetWorkdayTemplatesStorageForTests(): void {
  workdayTemplatesStorageOverride = null;
}

async function readWorkdayTemplates(): Promise<WorkdayTemplate[]> {
  if (workdayTemplatesStorageOverride) {
    return [...workdayTemplatesStorageOverride];
  }

  const stored = await AsyncStorage.getItem(WORKDAY_TEMPLATES_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isWorkdayTemplate);
  } catch {
    return [];
  }
}

async function writeWorkdayTemplates(templates: WorkdayTemplate[]): Promise<void> {
  logSaveWorkdayDev('persistence write started', { templateCount: templates.length });

  if (workdayTemplatesStorageOverride) {
    workdayTemplatesStorageOverride = [...templates];
    logSaveWorkdayDev('persistence write completed', { templateCount: templates.length });
    return;
  }

  await AsyncStorage.setItem(WORKDAY_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  logSaveWorkdayDev('persistence write completed', { templateCount: templates.length });
}

export async function getWorkdayTemplates(): Promise<WorkdayTemplate[]> {
  const templates = await readWorkdayTemplates();

  return [...templates].sort((left, right) => left.name.localeCompare(right.name));
}

export async function getWorkdayTemplateById(id: string): Promise<WorkdayTemplate | null> {
  const templates = await readWorkdayTemplates();

  return templates.find((template) => template.id === id) ?? null;
}

export async function findWorkdayTemplateByName(name: string): Promise<WorkdayTemplate | null> {
  const templates = await readWorkdayTemplates();

  return (
    templates.find((template) => workdayTemplateNamesMatch(template.name, name)) ?? null
  );
}

export async function createWorkdayTemplate(input: {
  name: string;
  stops: WorkdayTemplateStop[];
}): Promise<WorkdayTemplate> {
  const trimmedName = normalizeWorkdayTemplateName(input.name);

  if (!trimmedName) {
    throw new Error('Workday name is required.');
  }

  if (input.stops.length === 0) {
    throw new Error('Add at least one stop before saving a workday.');
  }

  const now = new Date().toISOString();
  const template: WorkdayTemplate = {
    id: createWorkdayTemplateId(),
    name: trimmedName,
    stops: input.stops,
    createdAt: now,
    updatedAt: now,
  };

  const templates = await readWorkdayTemplates();
  await writeWorkdayTemplates([template, ...templates]);

  return template;
}

export async function updateWorkdayTemplate(
  id: string,
  updates: Partial<Pick<WorkdayTemplate, 'name' | 'stops'>>,
): Promise<WorkdayTemplate | null> {
  const templates = await readWorkdayTemplates();
  const index = templates.findIndex((template) => template.id === id);

  if (index === -1) {
    return null;
  }

  const current = templates[index]!;
  const nextName =
    updates.name !== undefined ? normalizeWorkdayTemplateName(updates.name) : current.name;

  if (!nextName) {
    throw new Error('Workday name is required.');
  }

  if (
    updates.name !== undefined &&
    templates.some(
      (template) =>
        template.id !== id && workdayTemplateNamesMatch(template.name, nextName),
    )
  ) {
    throw new Error('A saved workday with that name already exists.');
  }

  const updated: WorkdayTemplate = {
    ...current,
    name: nextName,
    stops: updates.stops ?? current.stops,
    updatedAt: new Date().toISOString(),
  };

  const nextTemplates = [...templates];
  nextTemplates[index] = updated;
  await writeWorkdayTemplates(nextTemplates);

  return updated;
}

export async function deleteWorkdayTemplate(id: string): Promise<boolean> {
  const templates = await readWorkdayTemplates();
  const nextTemplates = templates.filter((template) => template.id !== id);

  if (nextTemplates.length === templates.length) {
    return false;
  }

  await writeWorkdayTemplates(nextTemplates);

  return true;
}

async function buildStoreLookup(): Promise<Record<string, Store>> {
  const stores = await getStores();

  return Object.fromEntries(stores.map((store) => [store.id, store]));
}

async function persistResolvedStops(stops: ResolvedWorkdayTemplateStop[]): Promise<void> {
  for (const stop of stops) {
    await upsertStore(createStoreFromResolvedWorkdayTemplateStop(stop));
  }
}

async function resolvedStopsFromTemplate(
  template: WorkdayTemplate,
): Promise<ResolvedWorkdayTemplateStop[]> {
  const storeLookup = await buildStoreLookup();

  return template.stops.map((stop) =>
    resolveWorkdayTemplateStop(stop, storeLookup[stop.storeId ?? '']),
  );
}

export async function applyWorkdayTemplateReplace(
  template: WorkdayTemplate,
): Promise<StoreVisit[]> {
  const scheduledDate = getTodayDateString();
  const resolvedStops = await resolvedStopsFromTemplate(template);

  await persistResolvedStops(resolvedStops);

  const visits = resolvedStops.map((stop, index) =>
    createVisitFromResolvedWorkdayTemplateStop(stop, index + 1, scheduledDate),
  );

  await replaceTodayVisits(visits);

  return visits;
}

export async function applyWorkdayTemplateAddMissing(
  template: WorkdayTemplate,
): Promise<{ visits: StoreVisit[]; addedCount: number; skippedCount: number }> {
  const scheduledDate = getTodayDateString();
  const currentVisits = await getTodayVisits();
  const stores = await getStores();
  const storesById = Object.fromEntries(stores.map((store) => [store.id, store]));
  const storeLookup = Object.fromEntries(stores.map((store) => [store.id, store]));
  const { appendedStops, skippedCount } = selectMissingWorkdayTemplateStops(
    template,
    currentVisits,
    storesById,
    storeLookup,
  );

  await persistResolvedStops(appendedStops);

  const startingOrder = currentVisits.length;
  const appendedVisits = appendedStops.map((stop, index) =>
    createVisitFromResolvedWorkdayTemplateStop(stop, startingOrder + index + 1, scheduledDate),
  );

  const visits = [...currentVisits, ...appendedVisits].map((visit, index) => ({
    ...visit,
    routeOrder: index + 1,
    updatedAt: Date.now(),
  }));

  await replaceTodayVisits(visits);

  return {
    visits,
    addedCount: appendedStops.length,
    skippedCount,
  };
}

export async function saveCurrentStopsAsWorkdayTemplate(input: {
  name: string;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): Promise<WorkdayTemplate> {
  const stops = buildWorkdayTemplateStopsFromVisits(input.visits, input.storesById);
  logSaveWorkdayDev('route payload created', {
    stopCount: stops.length,
    visitCount: input.visits.length,
  });

  return createWorkdayTemplate({
    name: input.name,
    stops,
  });
}

export async function replaceWorkdayTemplateWithCurrentStops(input: {
  templateId: string;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): Promise<WorkdayTemplate | null> {
  if (input.visits.length === 0) {
    throw new Error('Add at least one stop before saving a workday.');
  }

  const stops = buildWorkdayTemplateStopsFromVisits(input.visits, input.storesById);

  return updateWorkdayTemplate(input.templateId, { stops });
}

export async function replaceExistingWorkdayTemplateByName(input: {
  name: string;
  visits: StoreVisit[];
  storesById: Record<string, Store>;
}): Promise<WorkdayTemplate | null> {
  const existing = await findWorkdayTemplateByName(input.name);

  if (!existing) {
    return null;
  }

  return replaceWorkdayTemplateWithCurrentStops({
    templateId: existing.id,
    visits: input.visits,
    storesById: input.storesById,
  });
}
