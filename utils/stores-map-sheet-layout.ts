import type { StoresScope } from '@/components/stores/stores-screen';

/** Visible peek when the sheet is collapsed (handle + summary + quick filters). */
export const STORES_MAP_SHEET_COLLAPSED_SUMMARY_LINE_HEIGHT = 18;
export const STORES_MAP_SHEET_COLLAPSED_META_LINE_HEIGHT = 14;
export const STORES_MAP_SHEET_COLLAPSED_DRAG_PADDING_TOP = 4;
export const STORES_MAP_SHEET_COLLAPSED_DRAG_PADDING_BOTTOM = 4;
export const STORES_MAP_SHEET_COLLAPSED_TEXT_GAP = 2;
/** Small buffer so dynamic type / rounding does not clip chips. */
export const STORES_MAP_SHEET_COLLAPSED_HEIGHT_BUFFER = 2;

/** Compact floating map overlay (title + scope; search expands on demand). */
export const STORES_MAP_FLOATING_HEADER_TOP_OFFSET = 6;
export const STORES_MAP_FLOATING_HEADER_HORIZONTAL_INSET = 12;
export const STORES_MAP_FLOATING_HEADER_BACKPLATE_PADDING = 6;
export const STORES_MAP_FLOATING_HEADER_VERTICAL_GAP = 2;
export const STORES_MAP_FLOATING_HEADER_SCOPE_HEIGHT = 38;
export const STORES_MAP_FLOATING_HEADER_TITLE_ROW_HEIGHT = 36;
export const STORES_MAP_FLOATING_HEADER_SEARCH_EDIT_ROW_HEIGHT = 44;
export const STORES_MAP_FLOATING_HEADER_SEARCH_BUTTON_SIZE = 36;

/** Collapsed sheet quick-filter chips (neutral; not Workday colors). */
export const STORES_MAP_QUICK_FILTER_CHIP_HEIGHT = 34;
export const STORES_MAP_QUICK_FILTER_CHIP_MIN_HEIGHT = 32;
export const STORES_MAP_QUICK_FILTER_CHIP_MAX_HEIGHT = 36;
export const STORES_MAP_SHEET_COLLAPSED_HANDLE_HEIGHT = 10;
export const STORES_MAP_SHEET_COLLAPSED_HORIZONTAL_PADDING = 16;

/** Peek height when browse summary is hidden (handle only; floating store card visible). */
export const STORES_MAP_SHEET_MINIMIZED_COLLAPSED_HEIGHT = 28;

/** Floating selected-store card (above tab bar + minimized sheet handle). */
export const STORES_MAP_FLOATING_STORE_CARD_HORIZONTAL_INSET = 12;
export const STORES_MAP_FLOATING_STORE_CARD_BOTTOM_GAP = 12;
export const STORES_MAP_FLOATING_STORE_CARD_MAX_HEIGHT = 340;
export const STORES_MAP_FLOATING_STORE_CARD_MIN_HEIGHT = 260;

/** When the floating store preview is visible, hide browse sheet chrome (card sits on map). */
export const STORES_MAP_SHEET_SELECTED_STORE_PEEK_HEIGHT = 0;

export function computeStoresMapSheetSelectedStorePeekHeight(): number {
  return STORES_MAP_SHEET_SELECTED_STORE_PEEK_HEIGHT;
}

export const STORES_MAP_QUICK_FILTER_ROW_TRAILING_RESERVE = 76;

export function computeStoresMapFloatingStoreCardBottom(input?: {
  /** Optional sheet peek within the map host (host already sits above the tab bar). */
  minimizedSheetHeight?: number;
}): number {
  return (input?.minimizedSheetHeight ?? 0) + STORES_MAP_FLOATING_STORE_CARD_BOTTOM_GAP;
}

export function computeStoresMapSheetCollapsedContentHeight(): number {
  return (
    STORES_MAP_SHEET_COLLAPSED_DRAG_PADDING_TOP +
    STORES_MAP_SHEET_COLLAPSED_HANDLE_HEIGHT +
    STORES_MAP_SHEET_COLLAPSED_TEXT_GAP +
    STORES_MAP_SHEET_COLLAPSED_SUMMARY_LINE_HEIGHT +
    STORES_MAP_SHEET_COLLAPSED_TEXT_GAP +
    STORES_MAP_SHEET_COLLAPSED_META_LINE_HEIGHT +
    STORES_MAP_SHEET_COLLAPSED_TEXT_GAP +
    STORES_MAP_QUICK_FILTER_CHIP_HEIGHT +
    STORES_MAP_SHEET_COLLAPSED_DRAG_PADDING_BOTTOM +
    STORES_MAP_SHEET_COLLAPSED_HEIGHT_BUFFER
  );
}

export function computeStoresMapFloatingHeaderReserve(): number {
  return (
    STORES_MAP_FLOATING_HEADER_TOP_OFFSET +
    STORES_MAP_FLOATING_HEADER_BACKPLATE_PADDING * 2 +
    STORES_MAP_FLOATING_HEADER_TITLE_ROW_HEIGHT +
    STORES_MAP_FLOATING_HEADER_VERTICAL_GAP +
    STORES_MAP_FLOATING_HEADER_SCOPE_HEIGHT
  );
}

/** Vertical space reserved below the safe area for map fit / Show All. */
export const STORES_MAP_FLOATING_HEADER_COMPACT_RESERVE = computeStoresMapFloatingHeaderReserve();

/** Legacy reserve; prefer compact reserve when scope lives in sheet. */
export const STORES_MAP_FLOATING_HEADER_RESERVE = STORES_MAP_FLOATING_HEADER_COMPACT_RESERVE;

/** Compact horizontal Workday filter chips in the Stores map sheet. */
export const STORES_MAP_FILTER_CHIP_MIN_HEIGHT = 40;
export const STORES_MAP_FILTER_CHIP_MAX_HEIGHT = 48;
export const STORES_MAP_FILTER_ROW_HEIGHT = 48;

export const STORES_MAP_SHEET_STICKY_CONTROLS_GAP = 8;
export const STORES_MAP_SHEET_MEDIUM_HEIGHT_RATIO = 0.44;
/** Legacy ratio cap; expanded height uses host bounds + map strip. */
export const STORES_MAP_SHEET_EXPANDED_HEIGHT_RATIO = 0.88;
/**
 * Map strip visible above the sheet when expanded (host coordinates).
 * Screen distance from physical top ≈ safeAreaTop + this value (~125–145pt on common iPhones).
 */
export const STORES_MAP_SHEET_EXPANDED_MAP_STRIP_HEIGHT = 88;
/** Extra clearance so medium/expanded sheet chrome sits below the Dynamic Island. */
export const STORES_MAP_SHEET_SAFE_TOP_BUFFER = 8;
/** @deprecated Use {@link STORES_MAP_SHEET_EXPANDED_MAP_STRIP_HEIGHT}. */
export const STORES_MAP_SHEET_EXPANDED_TOP_PADDING = STORES_MAP_SHEET_EXPANDED_MAP_STRIP_HEIGHT;
/** @deprecated Use expanded map strip via {@link computeStoresMapSheetExpandedTopInset}. */
export const STORES_MAP_SHEET_EXPANDED_TOP_MARGIN = STORES_MAP_SHEET_EXPANDED_MAP_STRIP_HEIGHT;

/** Show All sits below compact header with this extra offset. */
export const STORES_MAP_RECENTER_BELOW_HEADER_OFFSET = 4;

const LIST_AT_TOP_EPSILON = 0.5;

/** Snap peek height matches collapsed chrome exactly (no filler below pills). */
export function computeStoresMapSheetCollapsedHeight(_bottomInset: number): number {
  return computeStoresMapSheetCollapsedContentHeight();
}

/** Y coordinate (screen space) of the expanded sheet top edge. */
export function computeStoresMapSheetExpandedTopInset(input: {
  topInset: number;
}): number {
  return computeStoresMapSheetMinimumTopFromHostTop(input);
}

/** Height of the Stores map host (full-bleed map area above tab bar). */
export function computeStoresMapSheetHostHeight(input: {
  tabBarHeight: number;
  topInset: number;
  windowHeight: number;
}): number {
  void input.topInset;

  return Math.max(0, input.windowHeight - input.tabBarHeight);
}

export function computeStoresMapSheetMinimumTopFromHostTop(input: {
  topInset: number;
}): number {
  return (
    input.topInset +
    STORES_MAP_SHEET_EXPANDED_MAP_STRIP_HEIGHT +
    STORES_MAP_SHEET_SAFE_TOP_BUFFER
  );
}

export function computeStoresMapSheetExpandedMapStripFromHostTop(input: {
  topInset: number;
}): number {
  return computeStoresMapSheetMinimumTopFromHostTop(input);
}

export function formatStoresMapSheetCollapsedLine(
  _scope: StoresScope,
  primarySummaryLine: string,
): string {
  return primarySummaryLine;
}

export function formatStoresMapSheetCollapsedMetaLine(counts: {
  missingLocation: number;
  onMap: number;
}): string {
  if (counts.missingLocation > 0) {
    return `${counts.onMap} on map · ${counts.missingLocation} need location`;
  }

  return `${counts.onMap} on map`;
}

export function shouldShowStoresMapFloatingHeader(input: {
  hostHeight: number;
  mediumSheetHeight: number;
  sheetSnap: 'collapsed' | 'medium' | 'expanded';
  topInset: number;
}): boolean {
  if (input.sheetSnap === 'expanded') {
    return false;
  }

  if (input.sheetSnap === 'collapsed') {
    return true;
  }

  const headerBottom = input.topInset + computeStoresMapFloatingHeaderReserve();
  const sheetTopY = input.hostHeight - input.mediumSheetHeight;

  return sheetTopY > headerBottom + 6;
}

export function shouldShowStoresMapRecenterControl(
  sheetSnap: 'collapsed' | 'medium' | 'expanded',
): boolean {
  return sheetSnap === 'collapsed' || sheetSnap === 'medium';
}

/** Map overlay “Show all” top offset (coordinates within the map host view). */
export function computeStoresMapRecenterTop(input: {
  collapsedSheetHeight: number;
  hostHeight: number;
  mediumSheetHeight: number;
  sheetSnap: 'collapsed' | 'medium' | 'expanded';
  topInset: number;
}): number {
  const headerClearance =
    input.topInset +
    computeStoresMapFloatingHeaderReserve() +
    STORES_MAP_RECENTER_BELOW_HEADER_OFFSET;

  if (input.sheetSnap === 'collapsed') {
    const sheetTopY = input.hostHeight - input.collapsedSheetHeight;

    return Math.max(headerClearance, sheetTopY - 44);
  }

  if (input.sheetSnap === 'medium') {
    const sheetTopY = input.hostHeight - input.mediumSheetHeight;

    return Math.max(headerClearance, Math.min(sheetTopY - 44, headerClearance + 36));
  }

  return headerClearance;
}

export function computeStoresMapFloatingHeaderTop(input: { topInset: number }): number {
  return input.topInset + STORES_MAP_FLOATING_HEADER_TOP_OFFSET;
}

export function isStoresMapSheetListAtTop(scrollOffsetY: number): boolean {
  return scrollOffsetY <= LIST_AT_TOP_EPSILON;
}

export function shouldStoresMapSheetTakeListGesture(input: {
  scrollOffsetY: number;
  translationY: number;
}): boolean {
  return isStoresMapSheetListAtTop(input.scrollOffsetY) && input.translationY > 0;
}

export function shouldStoresMapSheetPanFromListContent(scrollOffsetY: number): boolean {
  'worklet';

  return scrollOffsetY <= LIST_AT_TOP_EPSILON;
}
