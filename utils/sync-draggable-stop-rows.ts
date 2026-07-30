type RowWithVisit = {
  visit: { id: string; updatedAt: number | string };
};

type SyncDraggableStopRowsOptions<T> = {
  /** When visit.updatedAt is unchanged, still replace the row if content differs. */
  sameRowContent?: (left: T, right: T) => boolean;
};

/** Keep stable row references when order is unchanged (avoids list flicker after persist). */
export function syncDraggableStopRows<T extends RowWithVisit>(
  current: T[],
  fromProps: T[],
  options?: SyncDraggableStopRowsOptions<T>,
): T[] {
  const sameRowContent = options?.sameRowContent;
  if (current.length !== fromProps.length) {
    return fromProps;
  }

  const orderKey = (rows: T[]) => rows.map((row) => row.visit.id).join('\0');
  const currentOrder = orderKey(current);
  const nextOrder = orderKey(fromProps);

  if (currentOrder !== nextOrder) {
    return fromProps;
  }

  let changed = false;
  const merged = fromProps.map((nextRow, index) => {
    const previousRow = current[index]!;

    if (previousRow.visit.id !== nextRow.visit.id) {
      changed = true;
      return nextRow;
    }

    if (
      previousRow.visit.updatedAt === nextRow.visit.updatedAt &&
      previousRow === nextRow
    ) {
      return previousRow;
    }

    if (previousRow.visit.updatedAt === nextRow.visit.updatedAt) {
      if (sameRowContent?.(previousRow, nextRow) ?? previousRow === nextRow) {
        return previousRow;
      }

      changed = true;
      return nextRow;
    }

    changed = true;
    return nextRow;
  });

  return changed ? merged : current;
}
