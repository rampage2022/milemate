import {
  computeStoresMapFloatingHeaderReserve,
  STORES_MAP_RECENTER_BELOW_HEADER_OFFSET,
} from '@/utils/stores-map-sheet-layout';

export const STORES_MAP_OVERLAY_CONTROL_HEIGHT = 40;
export const STORES_MAP_OVERLAY_CONTROL_GAP = 8;
export const STORES_MAP_OVERLAY_CONTROL_STACK_HEIGHT =
  STORES_MAP_OVERLAY_CONTROL_HEIGHT * 2 + STORES_MAP_OVERLAY_CONTROL_GAP;
export const STORES_MAP_OVERLAY_CONTROL_COLLAPSED_GAP_ABOVE_SHEET = 24;

export function shouldShowStoresMapOverlayControls(input: {
  sheetSnap: 'collapsed' | 'medium' | 'expanded';
}): boolean {
  return input.sheetSnap === 'collapsed' || input.sheetSnap === 'medium';
}

export function shouldHideStoresMapOverlayControlsForExpandedSheet(input: {
  sheetSnap: 'collapsed' | 'medium' | 'expanded';
}): boolean {
  return input.sheetSnap === 'expanded';
}

export function computeStoresMapOverlayControlsTop(input: {
  collapsedSheetHeight: number;
  estimatedSelectedCardHeight: number;
  floatingCardBottom: number;
  hostHeight: number;
  mediumSheetHeight: number;
  selectedStoreCardVisible: boolean;
  sheetSnap: 'collapsed' | 'medium' | 'expanded';
  topInset: number;
}): number {
  const headerClearance =
    input.topInset +
    computeStoresMapFloatingHeaderReserve() +
    STORES_MAP_RECENTER_BELOW_HEADER_OFFSET;

  if (input.selectedStoreCardVisible) {
    const cardTopY =
      input.hostHeight -
      input.floatingCardBottom -
      input.estimatedSelectedCardHeight -
      STORES_MAP_OVERLAY_CONTROL_GAP -
      STORES_MAP_OVERLAY_CONTROL_STACK_HEIGHT;

    return Math.max(headerClearance, cardTopY);
  }

  if (input.sheetSnap === 'collapsed') {
    const sheetTopY = input.hostHeight - input.collapsedSheetHeight;
    const anchor =
      sheetTopY -
      STORES_MAP_OVERLAY_CONTROL_STACK_HEIGHT -
      STORES_MAP_OVERLAY_CONTROL_COLLAPSED_GAP_ABOVE_SHEET;

    return Math.max(headerClearance, anchor);
  }

  if (input.sheetSnap === 'medium') {
    const sheetTopY = input.hostHeight - input.mediumSheetHeight;
    const minVisibleMap = headerClearance + STORES_MAP_OVERLAY_CONTROL_STACK_HEIGHT + 24;

    if (sheetTopY < minVisibleMap) {
      return headerClearance;
    }

    return Math.max(headerClearance, Math.min(sheetTopY - STORES_MAP_OVERLAY_CONTROL_STACK_HEIGHT - 8, headerClearance + 36));
  }

  return headerClearance;
}

export function controlsOverlapSelectedStoreCard(input: {
  controlsTop: number;
  estimatedSelectedCardHeight: number;
  floatingCardBottom: number;
  hostHeight: number;
  selectedStoreCardVisible: boolean;
}): boolean {
  if (!input.selectedStoreCardVisible) {
    return false;
  }

  const controlsBottom = input.controlsTop + STORES_MAP_OVERLAY_CONTROL_STACK_HEIGHT;
  const cardTop =
    input.hostHeight - input.floatingCardBottom - input.estimatedSelectedCardHeight;

  return controlsBottom > cardTop - 4;
}
