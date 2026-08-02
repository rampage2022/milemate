import {
  computeStoresMapSheetCollapsedHeight,
  computeStoresMapSheetExpandedMapStripFromHostTop,
  computeStoresMapSheetExpandedTopInset,
  computeStoresMapSheetHostHeight,
  STORES_MAP_SHEET_MEDIUM_HEIGHT_RATIO,
} from '@/utils/stores-map-sheet-layout';

export type StoresMapSheetSnap = 'collapsed' | 'medium' | 'expanded';

export type StoresMapSheetSnapGeometry = {
  collapsedHeight: number;
  expandedHeight: number;
  expandedTopInset: number;
  mediumHeight: number;
  maxTranslateY: number;
  snapTranslateY: Record<StoresMapSheetSnap, number>;
};

export function computeStoresMapSheetSnapGeometry(input: {
  bottomInset: number;
  collapsedHeightOverride?: number;
  headerReserveHeight?: number;
  tabBarHeight: number;
  topInset: number;
  windowHeight: number;
}): StoresMapSheetSnapGeometry {
  const hostHeight = computeStoresMapSheetHostHeight({
    tabBarHeight: input.tabBarHeight,
    topInset: input.topInset,
    windowHeight: input.windowHeight,
  });
  const expandedTopInset = computeStoresMapSheetExpandedTopInset({
    topInset: input.topInset,
  });
  const expandedMapStripFromHostTop = computeStoresMapSheetExpandedMapStripFromHostTop({
    topInset: input.topInset,
  });
  const minSheetTopFromHostTop = expandedMapStripFromHostTop;
  const expandedHeight = Math.max(0, hostHeight - expandedMapStripFromHostTop);
  const collapsedHeight =
    input.collapsedHeightOverride ?? computeStoresMapSheetCollapsedHeight(input.bottomInset);
  const mediumHeight = Math.min(
    hostHeight,
    Math.max(
      input.windowHeight * STORES_MAP_SHEET_MEDIUM_HEIGHT_RATIO,
      expandedHeight * 0.46,
      collapsedHeight + 160,
    ),
  );
  const maxTranslateY = Math.max(0, expandedHeight - collapsedHeight);
  const snapExpandedY = 0;
  const uncappedMediumTop = hostHeight - mediumHeight;
  const mediumSheetTop = Math.max(minSheetTopFromHostTop, uncappedMediumTop);
  const sheetAnchorTop = hostHeight - expandedHeight;
  const snapMediumY = Math.max(snapExpandedY, mediumSheetTop - sheetAnchorTop);

  const snapTranslateY: Record<StoresMapSheetSnap, number> = {
    collapsed: maxTranslateY,
    medium: snapMediumY,
    expanded: snapExpandedY,
  };

  return {
    collapsedHeight,
    expandedHeight,
    expandedTopInset,
    maxTranslateY,
    mediumHeight,
    snapTranslateY,
  };
}

export function clampStoresMapSheetTranslateY(
  translateY: number,
  minTranslateY: number,
  maxTranslateY: number,
): number {
  'worklet';

  return Math.min(maxTranslateY, Math.max(minTranslateY, translateY));
}

/** Worklet-safe snap pick using primitive snap Y values (expanded = min translate Y). */
export function selectStoresMapSheetSnapFromGesture(input: {
  allowExpanded: number;
  snapCollapsedY: number;
  snapExpandedY: number;
  snapMediumY: number;
  translateY: number;
  velocityY: number;
}): StoresMapSheetSnap {
  'worklet';

  const minTranslateY = input.allowExpanded ? input.snapExpandedY : input.snapMediumY;
  const clampedY = clampStoresMapSheetTranslateY(
    input.translateY,
    minTranslateY,
    input.snapCollapsedY,
  );

  if (input.velocityY > 900) {
    return 'collapsed';
  }

  if (input.velocityY < -900) {
    return input.allowExpanded ? 'expanded' : 'medium';
  }

  const candidates: { snap: StoresMapSheetSnap; y: number }[] = [
    { snap: 'expanded', y: input.snapExpandedY },
    { snap: 'medium', y: input.snapMediumY },
    { snap: 'collapsed', y: input.snapCollapsedY },
  ];

  let chosen = candidates[1]!;
  let bestDistance = Math.abs(clampedY - chosen.y);

  for (const candidate of candidates) {
    const distance = Math.abs(clampedY - candidate.y);

    if (distance < bestDistance) {
      bestDistance = distance;
      chosen = candidate;
    }
  }

  if (!input.allowExpanded && chosen.snap === 'expanded') {
    return 'medium';
  }

  return chosen.snap;
}

export function clampStoresMapSheetSnapForContentMode(input: {
  allowExpanded: boolean;
  snap: StoresMapSheetSnap;
}): StoresMapSheetSnap {
  'worklet';

  if (!input.allowExpanded && input.snap === 'expanded') {
    return 'medium';
  }

  return input.snap;
}

export function translateYForStoresMapSheetSnap(input: {
  snap: StoresMapSheetSnap;
  snapCollapsedY: number;
  snapExpandedY: number;
  snapMediumY: number;
}): number {
  'worklet';

  if (input.snap === 'expanded') {
    return input.snapExpandedY;
  }

  if (input.snap === 'medium') {
    return input.snapMediumY;
  }

  return input.snapCollapsedY;
}

/** @deprecated Prefer selectStoresMapSheetSnapFromGesture in gesture handlers. */
export function nearestStoresMapSheetSnap(input: {
  geometry: StoresMapSheetSnapGeometry;
  translateY: number;
  velocityY: number;
}): StoresMapSheetSnap {
  return selectStoresMapSheetSnapFromGesture({
    allowExpanded: 1,
    snapCollapsedY: input.geometry.snapTranslateY.collapsed,
    snapExpandedY: input.geometry.snapTranslateY.expanded,
    snapMediumY: input.geometry.snapTranslateY.medium,
    translateY: input.translateY,
    velocityY: input.velocityY,
  });
}
