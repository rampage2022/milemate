import {
  canRemoveVisitDuringActiveRoute,
  isVisitLockedDuringActiveRoute,
  mergeReorderedPendingVisitIds,
} from '@/utils/active-route-editing';
import { refreshWorkdayCoordinatorFromPersistence } from '@/services/workday-coordinator-integration';
import {
  removeStopFromTodayRoute,
  reorderTodayRouteVisits,
} from '@/services/route-calculation';
import type { CompletionPhase } from '@/contexts/visit-advancement-context';
import type { StoreVisit } from '@/types/store-visit';

function sortByRouteOrder(visits: StoreVisit[]): StoreVisit[] {
  return [...visits].sort((left, right) => left.routeOrder - right.routeOrder);
}

export function buildPendingOrderForMakeNext(
  visits: StoreVisit[],
  selectedVisitId: string,
): string[] | null {
  const sorted = sortByRouteOrder(visits);
  const pending = sorted.filter((visit) => visit.status === 'pending');

  if (!pending.some((visit) => visit.id === selectedVisitId)) {
    return null;
  }

  const anchor = [...sorted]
    .reverse()
    .find(
      (visit) => visit.status === 'current' || visit.status === 'checked_in',
    );

  if (!anchor) {
    const rest = pending
      .filter((visit) => visit.id !== selectedVisitId)
      .map((visit) => visit.id);

    return [selectedVisitId, ...rest];
  }

  const anchorOrder = anchor.routeOrder;
  const head = pending
    .filter(
      (visit) => visit.id !== selectedVisitId && visit.routeOrder <= anchorOrder,
    )
    .map((visit) => visit.id);
  const tail = pending
    .filter(
      (visit) => visit.id !== selectedVisitId && visit.routeOrder > anchorOrder,
    )
    .map((visit) => visit.id);

  return [...head, selectedVisitId, ...tail];
}

export function buildPendingOrderForMakeFirst(
  visits: StoreVisit[],
  selectedVisitId: string,
): string[] | null {
  const sorted = sortByRouteOrder(visits);
  const pending = sorted.filter((visit) => visit.status === 'pending');

  if (!pending.some((visit) => visit.id === selectedVisitId)) {
    return null;
  }

  const hasNonPendingStop = sorted.some(
    (visit) => visit.status !== 'pending',
  );

  if (hasNonPendingStop) {
    return null;
  }

  const rest = pending
    .filter((visit) => visit.id !== selectedVisitId)
    .map((visit) => visit.id);

  return [selectedVisitId, ...rest];
}

export function mergePendingReorderIntoFullRoute(
  visits: StoreVisit[],
  orderedPendingVisitIds: string[],
): string[] {
  return mergeReorderedPendingVisitIds({
    visits,
    orderedPendingVisitIds,
  });
}

export function buildFullOrderFromPendingReorder(
  visits: StoreVisit[],
  reorderedRows: StoreVisit[],
): string[] {
  const reorderedIds = reorderedRows.map((visit) => visit.id);
  let reorderIndex = 0;
  const sorted = sortByRouteOrder(visits);

  return sorted.map((visit) => {
    if (isVisitLockedDuringActiveRoute(visit)) {
      return visit.id;
    }

    const nextId = reorderedIds[reorderIndex];
    reorderIndex += 1;
    return nextId ?? visit.id;
  });
}

export type ApplyRouteEditOptions = {
  completionPhase?: CompletionPhase;
  duringActiveWorkday: boolean;
};

export type ApplyRouteEditOptionsWithVisits = ApplyRouteEditOptions & {
  visits: StoreVisit[];
};

async function afterRouteStructureChange(
  action: string,
  completionPhase: CompletionPhase = 'idle',
): Promise<void> {
  await refreshWorkdayCoordinatorFromPersistence({
    action,
    completionPhase,
  });
}

export async function applyRouteReorder(
  orderedVisitIds: string[],
  options: ApplyRouteEditOptions,
): Promise<void> {
  await reorderTodayRouteVisits(orderedVisitIds, {
    duringActiveWorkday: options.duringActiveWorkday,
  });
  await afterRouteStructureChange('routeEditReorder', options.completionPhase);
}

export async function applyMakeNext(
  visits: StoreVisit[],
  selectedVisitId: string,
  options: ApplyRouteEditOptions,
): Promise<boolean> {
  const pendingOrder = buildPendingOrderForMakeNext(visits, selectedVisitId);

  if (!pendingOrder) {
    return false;
  }

  const merged = mergePendingReorderIntoFullRoute(visits, pendingOrder);
  await applyRouteReorder(merged, options);
  return true;
}

export async function applyMakeFirst(
  visits: StoreVisit[],
  selectedVisitId: string,
  options: ApplyRouteEditOptions,
): Promise<boolean> {
  const pendingOrder = buildPendingOrderForMakeFirst(visits, selectedVisitId);

  if (!pendingOrder) {
    return false;
  }

  if (options.duringActiveWorkday) {
    return false;
  }

  await applyRouteReorder(pendingOrder, options);
  return true;
}

export async function applyRemoveFromToday(
  visitId: string,
  options: ApplyRouteEditOptionsWithVisits,
): Promise<boolean> {
  const target = options.visits.find((visit) => visit.id === visitId);

  if (!target) {
    return false;
  }

  if (
    options.duringActiveWorkday &&
    !canRemoveVisitDuringActiveRoute(target)
  ) {
    return false;
  }

  if (
    !options.duringActiveWorkday &&
    (target.status === 'completed' || target.status === 'skipped')
  ) {
    return false;
  }

  await removeStopFromTodayRoute(visitId);
  await afterRouteStructureChange('routeEditRemove', options.completionPhase);
  return true;
}

export function canEditVisitInRoute(visit: StoreVisit): boolean {
  return !isVisitLockedDuringActiveRoute(visit);
}
