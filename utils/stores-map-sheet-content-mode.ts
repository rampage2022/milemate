import type { StoresMapPreviewModel } from '@/utils/stores-map-model';

export type StoresMapSheetContentMode = 'browse' | 'selected-store';

export function resolveStoresMapSheetContentMode(input: {
  preview: StoresMapPreviewModel | undefined;
  selectedStoreId: string | null;
}): StoresMapSheetContentMode {
  if (input.selectedStoreId && input.preview) {
    return 'selected-store';
  }

  return 'browse';
}

export function shouldStoresMapSheetAllowExpandedSnap(
  contentMode: StoresMapSheetContentMode,
): boolean {
  return contentMode === 'browse';
}

/** Most relevant smart-filter / context line for selected-store preview. */
export function pickStoresMapSelectedStoreSubtitle(preview: StoresMapPreviewModel): string {
  const smart = preview.contextLabels.find((label) => label.kind === 'smart');

  if (smart?.text) {
    return smart.text;
  }

  if (preview.membershipRows.length > 0) {
    return preview.primaryWorkdayLabel;
  }

  const shortAddress = preview.address.split(',')[0]?.trim();

  return shortAddress.length > 0 ? shortAddress : preview.address;
}

export function pickStoresMapSelectedStoreSmartHeadline(
  preview: StoresMapPreviewModel,
): string | null {
  const smart = preview.contextLabels.find((label) => label.kind === 'smart');

  return smart?.text ?? null;
}
