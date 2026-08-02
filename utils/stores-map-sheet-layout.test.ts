import assert from 'node:assert/strict';

import {
  selectStoresMapSheetSnapFromGesture,
  clampStoresMapSheetTranslateY,
  computeStoresMapSheetSnapGeometry,
} from '@/components/stores/stores-map-sheet-snap';
import {
  isStoresMapSheetListAtTop,
  shouldShowStoresMapRecenterControl,
  shouldStoresMapSheetPanFromListContent,
  shouldStoresMapSheetTakeListGesture,
  STORES_MAP_FILTER_CHIP_MAX_HEIGHT,
  STORES_MAP_FILTER_CHIP_MIN_HEIGHT,
  STORES_MAP_FILTER_ROW_HEIGHT,
  computeStoresMapSheetCollapsedHeight,
  computeStoresMapSheetCollapsedContentHeight,
  computeStoresMapSheetExpandedMapStripFromHostTop,
  computeStoresMapSheetMinimumTopFromHostTop,
  shouldShowStoresMapFloatingHeader,
} from '@/utils/stores-map-sheet-layout';

function geometry() {
  return computeStoresMapSheetSnapGeometry({
    bottomInset: 34,
    tabBarHeight: 49,
    topInset: 59,
    windowHeight: 844,
  });
}

function runTests() {
  const g = geometry();
  const mediumY = g.snapTranslateY.medium;
  const collapsedY = g.snapTranslateY.collapsed;

  assert.equal(
    selectStoresMapSheetSnapFromGesture({
      allowExpanded: 1,
      snapCollapsedY: collapsedY,
      snapExpandedY: g.snapTranslateY.expanded,
      snapMediumY: mediumY,
      translateY: collapsedY - 4,
      velocityY: 0,
    }),
    'collapsed',
  );

  assert.equal(
    selectStoresMapSheetSnapFromGesture({
      allowExpanded: 1,
      snapCollapsedY: collapsedY,
      snapExpandedY: g.snapTranslateY.expanded,
      snapMediumY: mediumY,
      translateY: mediumY / 2,
      velocityY: 0,
    }),
    'medium',
  );

  assert.equal(isStoresMapSheetListAtTop(0), true);
  assert.equal(isStoresMapSheetListAtTop(12), false);
  assert.equal(shouldStoresMapSheetTakeListGesture({ scrollOffsetY: 0, translationY: 8 }), true);
  assert.equal(shouldStoresMapSheetTakeListGesture({ scrollOffsetY: 20, translationY: 8 }), false);
  assert.equal(shouldStoresMapSheetPanFromListContent(0), true);
  assert.equal(shouldStoresMapSheetPanFromListContent(4), false);

  assert.equal(clampStoresMapSheetTranslateY(collapsedY + 200, g.snapTranslateY.expanded, collapsedY), collapsedY);

  const minTopFromHostTop = computeStoresMapSheetMinimumTopFromHostTop({ topInset: 59 });
  assert.equal(g.expandedTopInset, minTopFromHostTop);
  assert.equal(minTopFromHostTop, 155);
  const hostHeight = 844 - 49;
  assert.equal(g.expandedHeight, hostHeight - computeStoresMapSheetExpandedMapStripFromHostTop({ topInset: 59 }));
  assert.ok(g.snapTranslateY.medium > g.snapTranslateY.expanded);
  assert.ok(g.snapTranslateY.collapsed > g.snapTranslateY.medium);

  assert.equal(shouldShowStoresMapRecenterControl('collapsed'), true);
  assert.equal(shouldShowStoresMapRecenterControl('expanded'), false);
  assert.equal(shouldShowStoresMapRecenterControl('medium'), true);
  assert.equal(shouldShowStoresMapFloatingHeader({
    hostHeight: 700,
    mediumSheetHeight: 320,
    sheetSnap: 'collapsed',
    topInset: 59,
  }), true);
  assert.equal(shouldShowStoresMapFloatingHeader({
    hostHeight: 700,
    mediumSheetHeight: 320,
    sheetSnap: 'expanded',
    topInset: 59,
  }), false);
  assert.equal(shouldShowStoresMapFloatingHeader({
    hostHeight: 700,
    mediumSheetHeight: 580,
    sheetSnap: 'medium',
    topInset: 59,
  }), false);
  assert.equal(shouldShowStoresMapFloatingHeader({
    hostHeight: 700,
    mediumSheetHeight: 280,
    sheetSnap: 'medium',
    topInset: 59,
  }), true);

  const collapsedHeight = computeStoresMapSheetCollapsedHeight(34);
  assert.equal(collapsedHeight, computeStoresMapSheetCollapsedContentHeight());
  assert.ok(collapsedHeight >= 88 && collapsedHeight <= 104);

  assert.ok(STORES_MAP_FILTER_CHIP_MIN_HEIGHT >= 40);
  assert.ok(STORES_MAP_FILTER_CHIP_MAX_HEIGHT <= 48);
  assert.equal(STORES_MAP_FILTER_ROW_HEIGHT, 48);

  console.log('stores-map-sheet-layout tests passed');
}

runTests();
