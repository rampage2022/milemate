import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { getStores, upsertStore } from '@/services/stores';
import type { Store } from '@/types/store';
import type { WorkdayTemplate, WorkdayTemplateStop } from '@/types/workday-template';
import {
  reconcileWorkdayTemplateStopAgainstStores,
  type WorkdayTemplateStopLinkMethod,
} from '@/utils/workday-template-stop-store-link';

export type ReconcileWorkdayTemplateStoresResult = {
  createdStoreCount: number;
  linkedStopCount: number;
  routeOnlyStopCount: number;
  statsByMethod: Record<WorkdayTemplateStopLinkMethod, number>;
  stopsRepaired: number;
  storesCreated: Store[];
  templates: WorkdayTemplate[];
  templatesChanged: boolean;
  unresolvedStopCount: number;
};

function emptyMethodStats(): Record<WorkdayTemplateStopLinkMethod, number> {
  return {
    created_store: 0,
    direct: 0,
    duplicate_address: 0,
    duplicate_store_number: 0,
    import_alias: 0,
    name_and_address: 0,
    route_only: 0,
    unresolved: 0,
  };
}

function stopsEqual(left: WorkdayTemplateStop, right: WorkdayTemplateStop): boolean {
  return (
    left.id === right.id &&
    left.storeId === right.storeId &&
    left.sourceType === right.sourceType &&
    left.displayName === right.displayName &&
    left.address === right.address &&
    left.latitude === right.latitude &&
    left.longitude === right.longitude
  );
}

export function reconcileWorkdayTemplatesInMemory(input: {
  storeIdRemap: ReadonlyMap<string, string>;
  stores: Store[];
  templates: WorkdayTemplate[];
}): ReconcileWorkdayTemplateStoresResult {
  const statsByMethod = emptyMethodStats();
  let workingStores = [...input.stores];
  const storesCreated: Store[] = [];
  let stopsRepaired = 0;
  let linkedStopCount = 0;
  let routeOnlyStopCount = 0;
  let unresolvedStopCount = 0;
  let templatesChanged = false;

  const templates = input.templates.map((template) => {
    let templateChanged = false;
    const stops = template.stops.map((stop) => {
      const result = reconcileWorkdayTemplateStopAgainstStores({
        stop,
        storeIdRemap: input.storeIdRemap,
        stores: workingStores,
      });

      statsByMethod[result.linkMethod] += 1;

      if (result.createdStore) {
        workingStores = [...workingStores, result.createdStore];
        storesCreated.push(result.createdStore);
      }

      if (result.linkMethod === 'route_only') {
        routeOnlyStopCount += 1;
        return stop;
      }

      if (result.canonicalStoreId) {
        linkedStopCount += 1;
      } else if (result.linkMethod === 'unresolved') {
        unresolvedStopCount += 1;
      }

      if (result.stopChanged) {
        stopsRepaired += 1;
        templateChanged = true;
        return result.stop;
      }

      return stop;
    });

    if (templateChanged) {
      templatesChanged = true;

      return {
        ...template,
        stops,
        updatedAt: new Date().toISOString(),
      };
    }

    if (!stops.every((stop, index) => stopsEqual(stop, template.stops[index]!))) {
      templatesChanged = true;

      return { ...template, stops };
    }

    return template;
  });

  return {
    createdStoreCount: storesCreated.length,
    linkedStopCount,
    routeOnlyStopCount,
    statsByMethod,
    stopsRepaired,
    storesCreated,
    templates,
    templatesChanged,
    unresolvedStopCount,
  };
}

export async function reconcileWorkdayTemplateStopsForPersist(
  stops: WorkdayTemplateStop[],
): Promise<WorkdayTemplateStop[]> {
  const [stores, storeIdRemap] = await Promise.all([getStores(), getStoreImportIdRemap()]);
  const { storesCreated, templates } = reconcileWorkdayTemplatesInMemory({
    storeIdRemap,
    stores,
    templates: [
      {
        id: 'reconcile-single',
        name: 'reconcile-single',
        stops,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  for (const store of storesCreated) {
    await upsertStore(store);
  }

  return templates[0]?.stops ?? stops;
}

/** Loads stores/remap, reconciles catalog, persists template + store changes when needed. */
export async function ensureWorkdayTemplatesStoreLinksReconciled(
  templates: WorkdayTemplate[],
): Promise<ReconcileWorkdayTemplateStoresResult> {
  const [stores, storeIdRemap] = await Promise.all([getStores(), getStoreImportIdRemap()]);
  const result = reconcileWorkdayTemplatesInMemory({
    storeIdRemap,
    stores,
    templates,
  });

  for (const store of result.storesCreated) {
    await upsertStore(store);
  }

  return result;
}
