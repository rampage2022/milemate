import type { StoreVisit } from '@/types/store-visit';

/** Completed visits stay fixed in route order while editing. */
export function isVisitLockedDuringActiveRoute(visit: StoreVisit): boolean {
  return visit.status === 'completed';
}

export function canRemoveVisitDuringActiveRoute(visit: StoreVisit): boolean {
  return visit.status === 'pending';
}

export function canReorderVisitDuringActiveRoute(visit: StoreVisit): boolean {
  return visit.status !== 'completed';
}

export function mergeReorderedPendingVisitIds(input: {
  visits: StoreVisit[];
  orderedPendingVisitIds: string[];
}): string[] {
  const sorted = [...input.visits].sort(
    (left, right) => left.routeOrder - right.routeOrder,
  );
  const unlockedIds = new Set(
    sorted
      .filter((visit) => !isVisitLockedDuringActiveRoute(visit))
      .map((visit) => visit.id),
  );

  const reorderedUnlocked = input.orderedPendingVisitIds.filter((id) =>
    unlockedIds.has(id),
  );

  if (reorderedUnlocked.length !== unlockedIds.size) {
    return sorted.map((visit) => visit.id);
  }

  const result: string[] = [];
  let unlockedIndex = 0;

  for (const visit of sorted) {
    if (isVisitLockedDuringActiveRoute(visit)) {
      result.push(visit.id);
      continue;
    }

    result.push(reorderedUnlocked[unlockedIndex]!);
    unlockedIndex += 1;
  }

  return result;
}
