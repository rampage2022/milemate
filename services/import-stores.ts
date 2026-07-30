import type { Store } from '@/types/store';
import type {
  DuplicateDecision,
  ImportExecutionResult,
  ImportPreviewRow,
  ImportPreviewSummary,
  ResolvedImportRow,
  StoreImportMapping,
} from '@/types/store-import';
import { getStores, saveStores } from '@/services/stores';
import { appendStoreImportIdAlias } from '@/services/store-import-id-aliases';
import {
  findDuplicateInImportBatch,
  findPossibleStoreDuplicate,
} from '@/utils/store-import/find-possible-store-duplicate';
import { sanitizeImportedAddressComponent } from '@/utils/store-import/normalize-import-coordinates';
import { resolveImportedStoreRow } from '@/utils/store-import/resolve-store-import-mapping';
import { looksLikeCoordinateAddressLine } from '@/utils/store-display-address-core';

function createStoreId(): string {
  return `store-import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeResolvedAddressFields(resolved: ResolvedImportRow): ResolvedImportRow {
  return {
    ...resolved,
    addressLine1: sanitizeImportedAddressComponent(resolved.addressLine1),
    city: sanitizeImportedAddressComponent(resolved.city),
    state: sanitizeImportedAddressComponent(resolved.state),
    postalCode: sanitizeImportedAddressComponent(resolved.postalCode),
  };
}

function mergeImportedAddressLine(existing: Store, normalized: ResolvedImportRow): string {
  if (normalized.addressLine1.length > 0) {
    return normalized.addressLine1;
  }

  const importHasCoordinates =
    typeof normalized.latitude === 'number' &&
    typeof normalized.longitude === 'number';

  if (
    importHasCoordinates &&
    looksLikeCoordinateAddressLine(existing.addressLine1.trim())
  ) {
    return '';
  }

  return existing.addressLine1;
}

function applyImportedFields(existing: Store, resolved: ResolvedImportRow): Store {
  const normalized = sanitizeResolvedAddressFields(resolved);
  const now = Date.now();

  return {
    ...existing,
    name: normalized.storeName !== undefined && normalized.storeName.length > 0
      ? normalized.storeName
      : existing.name,
    storeNumber:
      normalized.storeNumber !== undefined && normalized.storeNumber.length > 0
        ? normalized.storeNumber
        : existing.storeNumber,
    addressLine1: mergeImportedAddressLine(existing, normalized),
    city: normalized.city.length > 0 ? normalized.city : existing.city,
    state: normalized.state.length > 0 ? normalized.state : existing.state,
    postalCode:
      normalized.postalCode.length > 0 ? normalized.postalCode : existing.postalCode,
    managerName:
      normalized.managerName !== undefined && normalized.managerName.length > 0
        ? normalized.managerName
        : existing.managerName,
    managerPhone:
      normalized.managerPhone !== undefined && normalized.managerPhone.length > 0
        ? normalized.managerPhone
        : existing.managerPhone,
    latitude: normalized.latitude ?? existing.latitude,
    longitude: normalized.longitude ?? existing.longitude,
    updatedAt: now,
  };
}

function createStoreFromImport(resolved: ResolvedImportRow): Store {
  const normalized = sanitizeResolvedAddressFields(resolved);
  const now = Date.now();

  return {
    id: createStoreId(),
    name: normalized.storeName ?? '',
    storeNumber: normalized.storeNumber,
    addressLine1: normalized.addressLine1,
    city: normalized.city,
    state: normalized.state,
    postalCode: normalized.postalCode,
    managerName: normalized.managerName,
    managerPhone: normalized.managerPhone,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    createdAt: now,
    updatedAt: now,
  };
}

type ImportReverseGeocodeHandler = (store: Store) => Promise<Store>;

let importReverseGeocodeHandler: ImportReverseGeocodeHandler | null = null;

async function reverseGeocodeImportedStore(store: Store): Promise<Store> {
  if (importReverseGeocodeHandler) {
    return importReverseGeocodeHandler(store);
  }

  const { ensureStoreReverseGeocodedAddress } = await import(
    '@/services/store-display-address'
  );

  return ensureStoreReverseGeocodedAddress(store);
}

/** @internal */
export function __setImportReverseGeocodeHandlerForTests(
  handler: ImportReverseGeocodeHandler | null,
): void {
  importReverseGeocodeHandler = handler;
}

async function finalizeImportedStores(
  nextStores: Store[],
  touchedStoreIds: Set<string>,
): Promise<Store[]> {
  if (touchedStoreIds.size === 0) {
    return nextStores;
  }

  return Promise.all(
    nextStores.map(async (store) => {
      if (!touchedStoreIds.has(store.id)) {
        return store;
      }

      return reverseGeocodeImportedStore(store);
    }),
  );
}

async function executeImportPreviewRows(
  previewRows: ImportPreviewRow[],
  existingStores: Store[],
): Promise<{ nextStores: Store[]; result: ImportExecutionResult }> {
  const nextStores = [...existingStores];
  const touchedStoreIds = new Set<string>();
  const result: ImportExecutionResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    warnings: 0,
  };

  for (const row of previewRows) {
    if (row.outcome === 'error' || row.outcome === 'duplicate_in_file' || row.outcome === 'skip') {
      result.skipped += 1;
      continue;
    }

    try {
      if (row.outcome === 'update' && row.existingStoreId) {
        const index = nextStores.findIndex((store) => store.id === row.existingStoreId);

        if (index === -1) {
          result.failed += 1;
          continue;
        }

        const updated = applyImportedFields(nextStores[index]!, row.resolved);
        nextStores[index] = updated;
        touchedStoreIds.add(updated.id);
        result.updated += 1;

        if (row.resolved.validationStatus === 'warning') {
          result.warnings += 1;
        }

        continue;
      }

      if (row.outcome === 'create' || row.outcome === 'warning') {
        const created = createStoreFromImport(row.resolved);
        nextStores.push(created);
        touchedStoreIds.add(created.id);
        result.created += 1;

        if (
          row.duplicateDecision === 'create' &&
          row.existingStoreId &&
          row.existingStoreId !== created.id
        ) {
          await appendStoreImportIdAlias({
            fromStoreId: row.existingStoreId,
            toStoreId: created.id,
          });
        }

        if (row.resolved.validationStatus === 'warning') {
          result.warnings += 1;
        }
      }
    } catch {
      result.failed += 1;
    }
  }

  const finalizedStores = await finalizeImportedStores(nextStores, touchedStoreIds);

  return { nextStores: finalizedStores, result };
}

export function buildImportPreviewRows(
  rows: Record<string, string>[],
  rowNumbers: number[],
  mapping: StoreImportMapping,
  existingStores: Store[],
): ImportPreviewRow[] {
  const previewRows: ImportPreviewRow[] = [];
  const resolvedValidRows: ResolvedImportRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = rowNumbers[index] ?? index + 2;
    const resolved = resolveImportedStoreRow(row, rowNumber, mapping);

    if (resolved.validationStatus === 'invalid') {
      previewRows.push({
        rowNumber,
        resolved,
        outcome: 'error',
      });
      return;
    }

    const duplicateInFile = findDuplicateInImportBatch(resolved, resolvedValidRows);

    if (duplicateInFile) {
      previewRows.push({
        rowNumber,
        resolved: {
          ...resolved,
          messages: [...resolved.messages, 'Duplicate row inside import file'],
        },
        outcome: 'duplicate_in_file',
      });
      return;
    }

    const duplicateMatch = findPossibleStoreDuplicate(resolved, existingStores);

    if (duplicateMatch?.confidence === 'confident') {
      previewRows.push({
        rowNumber,
        resolved,
        outcome: 'update',
        duplicateMatch,
        existingStoreId: duplicateMatch.existingStore.id,
      });
      resolvedValidRows.push(resolved);
      return;
    }

    if (duplicateMatch?.confidence === 'possible') {
      previewRows.push({
        rowNumber,
        resolved,
        outcome: 'possible_duplicate',
        duplicateMatch,
        existingStoreId: duplicateMatch.existingStore.id,
      });
      resolvedValidRows.push(resolved);
      return;
    }

    previewRows.push({
      rowNumber,
      resolved,
      outcome: resolved.validationStatus === 'warning' ? 'warning' : 'create',
    });
    resolvedValidRows.push(resolved);
  });

  return previewRows;
}

export function summarizeImportPreview(rows: ImportPreviewRow[]): ImportPreviewSummary {
  const validRows = rows.filter(
    (row) => row.resolved.validationStatus === 'valid' || row.resolved.validationStatus === 'warning',
  ).length;
  const warningRows = rows.filter((row) => row.resolved.validationStatus === 'warning').length;
  const invalidRows = rows.filter((row) => row.resolved.validationStatus === 'invalid').length;

  return {
    totalRows: rows.length,
    validRows,
    warningRows,
    invalidRows,
    newStores: rows.filter((row) => row.outcome === 'create' || row.outcome === 'warning').length,
    updates: rows.filter((row) => row.outcome === 'update').length,
    possibleDuplicates: rows.filter((row) => row.outcome === 'possible_duplicate').length,
    skipped: rows.filter(
      (row) => row.outcome === 'error' || row.outcome === 'duplicate_in_file' || row.outcome === 'skip',
    ).length,
    errors: rows.filter((row) => row.outcome === 'error').length,
  };
}

export function applyDuplicateDecisions(
  rows: ImportPreviewRow[],
  decisions: Record<number, DuplicateDecision>,
): ImportPreviewRow[] {
  return rows.map((row) => {
    if (row.outcome !== 'possible_duplicate') {
      return row;
    }

    const decision = decisions[row.rowNumber] ?? 'skip';

    if (decision === 'update') {
      return {
        ...row,
        outcome: 'update',
        duplicateDecision: 'update',
      };
    }

    if (decision === 'create') {
      return {
        ...row,
        outcome: row.resolved.validationStatus === 'warning' ? 'warning' : 'create',
        duplicateDecision: 'create',
        existingStoreId: undefined,
        duplicateMatch: undefined,
      };
    }

    return {
      ...row,
      outcome: 'skip',
      duplicateDecision: 'skip',
    };
  });
}

export async function importStoresSafely(
  previewRows: ImportPreviewRow[],
): Promise<ImportExecutionResult> {
  const existingStores = await getStores();
  const { nextStores, result } = await executeImportPreviewRows(
    previewRows,
    existingStores,
  );

  await saveStores(nextStores);

  return result;
}

export async function importStoresSafelyWithRollback(
  previewRows: ImportPreviewRow[],
  writeStores: (stores: Store[]) => Promise<void>,
  readStores: () => Promise<Store[]>,
): Promise<ImportExecutionResult> {
  const existingStores = await readStores();
  const { nextStores, result } = await executeImportPreviewRows(
    previewRows,
    existingStores,
  );

  try {
    await writeStores(nextStores);
  } catch {
    await writeStores(existingStores);
    throw new Error('Import failed. Previous stores were preserved.');
  }

  return result;
}
