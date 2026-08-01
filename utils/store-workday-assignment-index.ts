import type { WorkdayTemplate } from '@/types/workday-template';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';
import { isRouteOnlyWorkdayTemplateStop } from '@/utils/workday-template-stop-store-link';

export type StoreWorkdayAssignmentEntry = {
  primaryWorkdayId?: string;
  workdayIds: string[];
};

export type OrphanedWorkdayStoreReference = {
  storeId: string;
  workdayTemplateId: string;
};

export type StoreWorkdayAssignmentIndex = {
  byStoreId: Map<string, StoreWorkdayAssignmentEntry>;
  orphanedStoreReferences: OrphanedWorkdayStoreReference[];
};

export type BuildStoreWorkdayAssignmentIndexInput = {
  /** When set, store ids not in this set are recorded as orphans and excluded from membership. */
  validStoreIds?: ReadonlySet<string>;
  storeIdRemap: ReadonlyMap<string, string>;
  templates: WorkdayTemplate[];
};

function compareTemplatesForMembershipOrder(
  left: WorkdayTemplate,
  right: WorkdayTemplate,
): number {
  const createdCompare = left.createdAt.localeCompare(right.createdAt);

  if (createdCompare !== 0) {
    return createdCompare;
  }

  return left.id.localeCompare(right.id);
}

function selectPrimaryWorkdayId(
  workdayIds: string[],
  templateById: Map<string, WorkdayTemplate>,
): string | undefined {
  if (workdayIds.length === 0) {
    return undefined;
  }

  if (workdayIds.length === 1) {
    return workdayIds[0];
  }

  const memberships = workdayIds
    .map((id) => templateById.get(id))
    .filter((template): template is WorkdayTemplate => template !== undefined)
    .sort(compareTemplatesForMembershipOrder);

  return memberships[0]?.id ?? workdayIds[0];
}

/**
 * Pure index of store membership in saved Workday templates.
 * Does not mutate stores or templates.
 */
export function buildStoreWorkdayAssignmentIndex(
  input: BuildStoreWorkdayAssignmentIndexInput,
): StoreWorkdayAssignmentIndex {
  const templateById = new Map(input.templates.map((template) => [template.id, template]));
  const sortedTemplates = [...input.templates].sort(compareTemplatesForMembershipOrder);
  const workdayIdsByStore = new Map<string, string[]>();
  const orphanedStoreReferences: OrphanedWorkdayStoreReference[] = [];

  for (const template of sortedTemplates) {
    const seenInTemplate = new Set<string>();

    for (const stop of template.stops) {
      if (isRouteOnlyWorkdayTemplateStop(stop)) {
        continue;
      }

      const rawStoreId = stop.storeId?.trim();

      if (!rawStoreId) {
        continue;
      }

      const storeId = resolveRemappedStoreId(rawStoreId, input.storeIdRemap);

      if (seenInTemplate.has(storeId)) {
        continue;
      }

      seenInTemplate.add(storeId);

      if (input.validStoreIds && !input.validStoreIds.has(storeId)) {
        orphanedStoreReferences.push({
          storeId,
          workdayTemplateId: template.id,
        });
        continue;
      }

      const existing = workdayIdsByStore.get(storeId) ?? [];

      if (!existing.includes(template.id)) {
        workdayIdsByStore.set(storeId, [...existing, template.id]);
      }
    }
  }

  const byStoreId = new Map<string, StoreWorkdayAssignmentEntry>();

  for (const [storeId, workdayIds] of workdayIdsByStore.entries()) {
    const orderedIds = workdayIds
      .map((id) => templateById.get(id))
      .filter((template): template is WorkdayTemplate => template !== undefined)
      .sort(compareTemplatesForMembershipOrder)
      .map((template) => template.id);

    byStoreId.set(storeId, {
      workdayIds: orderedIds,
      primaryWorkdayId: selectPrimaryWorkdayId(orderedIds, templateById),
    });
  }

  orphanedStoreReferences.sort((left, right) => {
    const templateCompare = left.workdayTemplateId.localeCompare(right.workdayTemplateId);

    if (templateCompare !== 0) {
      return templateCompare;
    }

    return left.storeId.localeCompare(right.storeId);
  });

  return { byStoreId, orphanedStoreReferences };
}

export type StoreWorkdayMapDiagnosticSummary = {
  assignedStoreCount: number;
  canonicallyLinkedStopCount: number;
  createdFromTemplateStopCount: number;
  currentStoreLibraryCount: number;
  duplicateReconciledStopCount: number;
  importAliasRepairedStopCount: number;
  multiWorkdayStoreCount: number;
  routeOnlyStopCount: number;
  templateCount: number;
  templatesWithMapMetadata: number;
  unassignedCanonicalStoreCount: number | null;
  unresolvedStoreReferenceCount: number;
};

export function summarizeStoreWorkdayMapDiagnostics(input: {
  assignmentIndex: StoreWorkdayAssignmentIndex;
  linkMethodCounts?: Partial<Record<string, number>>;
  storeCount?: number;
  templates: WorkdayTemplate[];
}): StoreWorkdayMapDiagnosticSummary {
  const templatesWithMapMetadata = input.templates.filter(
    (template) =>
      template.mapColorKey !== undefined && template.pinAbbreviation !== undefined,
  ).length;

  let multiWorkdayStoreCount = 0;

  for (const entry of input.assignmentIndex.byStoreId.values()) {
    if (entry.workdayIds.length > 1) {
      multiWorkdayStoreCount += 1;
    }
  }

  const assignedStoreCount = input.assignmentIndex.byStoreId.size;
  const currentStoreLibraryCount = input.storeCount ?? 0;
  const unassignedCanonicalStoreCount =
    input.storeCount === undefined
      ? null
      : Math.max(0, currentStoreLibraryCount - assignedStoreCount);

  const counts = input.linkMethodCounts ?? {};

  return {
    assignedStoreCount,
    canonicallyLinkedStopCount: (counts.direct ?? 0) as number,
    createdFromTemplateStopCount: (counts.created_store ?? 0) as number,
    currentStoreLibraryCount,
    duplicateReconciledStopCount:
      ((counts.duplicate_address ?? 0) as number) +
      ((counts.duplicate_store_number ?? 0) as number) +
      ((counts.name_and_address ?? 0) as number),
    importAliasRepairedStopCount: (counts.import_alias ?? 0) as number,
    multiWorkdayStoreCount,
    routeOnlyStopCount: (counts.route_only ?? 0) as number,
    templateCount: input.templates.length,
    templatesWithMapMetadata,
    unassignedCanonicalStoreCount,
    unresolvedStoreReferenceCount: input.assignmentIndex.orphanedStoreReferences.length,
  };
}
