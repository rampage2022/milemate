import type { Store } from '@/types/store';
import type { WorkdayTemplate } from '@/types/workday-template';
import { normalizeWorkdayTemplateAddress } from '@/utils/workday-template-utils';
import { resolveRemappedStoreId } from '@/utils/store-duplicate-clusters';
import {
  isRouteOnlyWorkdayTemplateStop,
  reconcileWorkdayTemplateStopAgainstStores,
  type WorkdayTemplateStopLinkMethod,
} from '@/utils/workday-template-stop-store-link';

export type WorkdayTemplateStopAuditReport = {
  stopsWithStoreId: number;
  directLibraryMatches: number;
  aliasResolvedMatches: number;
  duplicateReconciliationMatches: number;
  storesCreatedFromStops: number;
  routeOnlyStops: number;
  unresolvedStoreReferences: number;
  storeTypeStops: number;
  addressOnlyStops: number;
  sameAddressDifferentIds: number;
  totalStops: number;
  /** Unique template store ids that would join assignment index after reconcile. */
  projectedAssignedStoreIds: number;
  /** Why Phase-1 index showed 12 assigned with 6 library stores. */
  explanation: string;
};

function stopLooksStoreSourced(template: WorkdayTemplate, stopIndex: number): boolean {
  const stop = template.stops[stopIndex]!;

  return stop.sourceType === 'store' || Boolean(stop.storeId?.trim() && !isRouteOnlyWorkdayTemplateStop(stop));
}

export function auditWorkdayTemplateStops(input: {
  storeIdRemap: ReadonlyMap<string, string>;
  stores: Store[];
  templates: WorkdayTemplate[];
}): WorkdayTemplateStopAuditReport {
  const storesById = new Set(input.stores.map((store) => store.id));
  let stopsWithStoreId = 0;
  let directLibraryMatches = 0;
  let aliasResolvedMatches = 0;
  let duplicateReconciliationMatches = 0;
  let storesCreatedFromStops = 0;
  let routeOnlyStops = 0;
  let unresolvedStoreReferences = 0;
  let storeTypeStops = 0;
  let addressOnlyStops = 0;

  const addressToIds = new Map<string, Set<string>>();
  const projectedAssigned = new Set<string>();
  let workingStores = [...input.stores];

  for (const template of input.templates) {
    for (const stop of template.stops) {
      if (stop.storeId?.trim()) {
        stopsWithStoreId += 1;
      }

      if (isRouteOnlyWorkdayTemplateStop(stop)) {
        routeOnlyStops += 1;
        addressOnlyStops += 1;
        continue;
      }

      if (stop.sourceType === 'store') {
        storeTypeStops += 1;
      } else {
        addressOnlyStops += 1;
      }

      const normalizedAddress = normalizeWorkdayTemplateAddress(stop.address);

      if (normalizedAddress && stop.storeId?.trim()) {
        const bucket = addressToIds.get(normalizedAddress) ?? new Set<string>();
        bucket.add(stop.storeId.trim());
        addressToIds.set(normalizedAddress, bucket);
      }

      const rawId = stop.storeId?.trim();

      if (rawId && storesById.has(rawId)) {
        directLibraryMatches += 1;
      } else if (rawId) {
        const remapped = resolveRemappedStoreId(rawId, input.storeIdRemap);

        if (remapped !== rawId && storesById.has(remapped)) {
          aliasResolvedMatches += 1;
        }
      }

      const result = reconcileWorkdayTemplateStopAgainstStores({
        stop,
        storeIdRemap: input.storeIdRemap,
        stores: workingStores,
      });

      if (result.createdStore) {
        workingStores = [...workingStores, result.createdStore];
        storesCreatedFromStops += 1;
      }

      if (result.linkMethod === 'route_only') {
        continue;
      }

      if (result.canonicalStoreId) {
        projectedAssigned.add(result.canonicalStoreId);

        if (
          result.linkMethod === 'duplicate_address' ||
          result.linkMethod === 'duplicate_store_number' ||
          result.linkMethod === 'name_and_address'
        ) {
          duplicateReconciliationMatches += 1;
        }
      } else if (result.linkMethod === 'unresolved') {
        unresolvedStoreReferences += 1;
      }
    }
  }

  let sameAddressDifferentIds = 0;

  for (const ids of addressToIds.values()) {
    if (ids.size > 1) {
      sameAddressDifferentIds += 1;
    }
  }

  const staleIdCount = input.templates.reduce((count, template) => {
    return (
      count +
      template.stops.filter((stop) => {
        const id = stop.storeId?.trim();

        if (!id || isRouteOnlyWorkdayTemplateStop(stop)) {
          return false;
        }

        const remapped = resolveRemappedStoreId(id, input.storeIdRemap);

        return !storesById.has(remapped);
      }).length
    );
  }, 0);

  const explanation =
    `Assignment index counts distinct template storeIds that pass validStoreIds; ` +
    `${staleIdCount} store-type stops reference ids outside the current ${input.stores.length}-store library ` +
    `(often pre-import Dallas ids), so only ${projectedAssigned.size} canonical ids would assign after reconcile. ` +
    `Multi-workday stays 0 until those ids collapse to shared canonical stores across templates.`;

  return {
    addressOnlyStops,
    aliasResolvedMatches,
    directLibraryMatches,
    duplicateReconciliationMatches,
    explanation,
    projectedAssignedStoreIds: projectedAssigned.size,
    routeOnlyStops,
    sameAddressDifferentIds,
    stopsWithStoreId,
    storeTypeStops,
    storesCreatedFromStops,
    totalStops: input.templates.reduce((sum, template) => sum + template.stops.length, 0),
    unresolvedStoreReferences,
  };
}

export function countStopsByLinkMethod(
  templates: WorkdayTemplate[],
  stores: Store[],
  storeIdRemap: ReadonlyMap<string, string>,
): Record<WorkdayTemplateStopLinkMethod, number> {
  const counts: Record<WorkdayTemplateStopLinkMethod, number> = {
    created_store: 0,
    direct: 0,
    duplicate_address: 0,
    duplicate_store_number: 0,
    import_alias: 0,
    name_and_address: 0,
    route_only: 0,
    unresolved: 0,
  };

  let workingStores = [...stores];

  for (const template of templates) {
    for (const stop of template.stops) {
      const result = reconcileWorkdayTemplateStopAgainstStores({
        stop,
        storeIdRemap,
        stores: workingStores,
      });

      counts[result.linkMethod] += 1;

      if (result.createdStore) {
        workingStores = [...workingStores, result.createdStore];
      }
    }
  }

  return counts;
}
