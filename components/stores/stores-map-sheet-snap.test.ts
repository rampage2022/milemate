import assert from 'node:assert/strict';

import {
  clampStoresMapSheetTranslateY,
  computeStoresMapSheetSnapGeometry,
  selectStoresMapSheetSnapFromGesture,
  translateYForStoresMapSheetSnap,
} from '@/components/stores/stores-map-sheet-snap';
import {
  STORES_MAP_SHEET_EXPANDED_MAP_STRIP_HEIGHT,
  STORES_MAP_SHEET_EXPANDED_TOP_PADDING,
  STORES_MAP_SHEET_SAFE_TOP_BUFFER,
  computeStoresMapSheetExpandedMapStripFromHostTop,
  computeStoresMapSheetExpandedTopInset,
  computeStoresMapSheetHostHeight,
  computeStoresMapSheetMinimumTopFromHostTop,
} from '@/utils/stores-map-sheet-layout';

function sampleGeometry() {
  return computeStoresMapSheetSnapGeometry({
    bottomInset: 34,
    tabBarHeight: 49,
    topInset: 59,
    windowHeight: 844,
  });
}

function runTests() {
  const geometry = sampleGeometry();
  const expandedY = geometry.snapTranslateY.expanded;
  const mediumY = geometry.snapTranslateY.medium;
  const collapsedY = geometry.snapTranslateY.collapsed;

  const expectedTopInset = computeStoresMapSheetExpandedTopInset({ topInset: 59 });
  assert.equal(
    expectedTopInset,
    59 + STORES_MAP_SHEET_EXPANDED_MAP_STRIP_HEIGHT + STORES_MAP_SHEET_SAFE_TOP_BUFFER,
  );
  assert.equal(STORES_MAP_SHEET_EXPANDED_TOP_PADDING, STORES_MAP_SHEET_EXPANDED_MAP_STRIP_HEIGHT);
  assert.equal(geometry.expandedTopInset, expectedTopInset);
  const hostHeight = computeStoresMapSheetHostHeight({
    tabBarHeight: 49,
    topInset: 59,
    windowHeight: 844,
  });
  assert.equal(hostHeight, 844 - 49);
  const mapStrip = computeStoresMapSheetExpandedMapStripFromHostTop({ topInset: 59 });
  assert.equal(mapStrip, computeStoresMapSheetMinimumTopFromHostTop({ topInset: 59 }));
  assert.equal(geometry.expandedHeight, hostHeight - mapStrip);
  const mediumTopAtSnap = hostHeight - geometry.expandedHeight + mediumY;
  assert.ok(mediumTopAtSnap >= mapStrip - 0.5);
  assert.ok(geometry.expandedTopInset >= 145 && geometry.expandedTopInset <= 165);

  assert.ok(collapsedY > mediumY);
  assert.ok(mediumY > expandedY);
  assert.equal(expandedY, 0);

  assert.equal(clampStoresMapSheetTranslateY(-40, expandedY, collapsedY), expandedY);
  assert.equal(clampStoresMapSheetTranslateY(collapsedY + 500, expandedY, collapsedY), collapsedY);
  assert.equal(clampStoresMapSheetTranslateY(mediumY, expandedY, collapsedY), mediumY);

  assert.equal(
    selectStoresMapSheetSnapFromGesture({
      allowExpanded: 1,
      snapCollapsedY: collapsedY,
      snapExpandedY: expandedY,
      snapMediumY: mediumY,
      translateY: collapsedY,
      velocityY: 0,
    }),
    'collapsed',
  );

  assert.equal(
    selectStoresMapSheetSnapFromGesture({
      allowExpanded: 1,
      snapCollapsedY: collapsedY,
      snapExpandedY: expandedY,
      snapMediumY: mediumY,
      translateY: collapsedY,
      velocityY: 5000,
    }),
    'collapsed',
  );

  assert.equal(
    selectStoresMapSheetSnapFromGesture({
      allowExpanded: 1,
      snapCollapsedY: collapsedY,
      snapExpandedY: expandedY,
      snapMediumY: mediumY,
      translateY: collapsedY + 800,
      velocityY: 0,
    }),
    'collapsed',
  );

  const fromMediumDown = selectStoresMapSheetSnapFromGesture({
    allowExpanded: 1,
    snapCollapsedY: collapsedY,
    snapExpandedY: expandedY,
    snapMediumY: mediumY,
    translateY: (mediumY + collapsedY) / 2,
    velocityY: 0,
  });
  assert.ok(fromMediumDown === 'medium' || fromMediumDown === 'collapsed');

  const fromMediumUp = selectStoresMapSheetSnapFromGesture({
    allowExpanded: 1,
    snapCollapsedY: collapsedY,
    snapExpandedY: expandedY,
    snapMediumY: mediumY,
    translateY: mediumY / 2,
    velocityY: 0,
  });
  assert.ok(fromMediumUp === 'medium' || fromMediumUp === 'expanded');

  assert.equal(
    selectStoresMapSheetSnapFromGesture({
      allowExpanded: 1,
      snapCollapsedY: collapsedY,
      snapExpandedY: expandedY,
      snapMediumY: mediumY,
      translateY: mediumY,
      velocityY: -5000,
    }),
    'expanded',
  );

  assert.equal(
    selectStoresMapSheetSnapFromGesture({
      allowExpanded: 0,
      snapCollapsedY: collapsedY,
      snapExpandedY: expandedY,
      snapMediumY: mediumY,
      translateY: mediumY,
      velocityY: -5000,
    }),
    'medium',
  );

  for (const snap of ['collapsed', 'medium', 'expanded'] as const) {
    const y = translateYForStoresMapSheetSnap({
      snap,
      snapCollapsedY: collapsedY,
      snapExpandedY: expandedY,
      snapMediumY: mediumY,
    });
    assert.ok(y >= expandedY && y <= collapsedY);
  }

  assert.equal(
    translateYForStoresMapSheetSnap({
      snap: 'collapsed',
      snapCollapsedY: collapsedY,
      snapExpandedY: expandedY,
      snapMediumY: mediumY,
    }),
    collapsedY,
  );

  console.log('stores-map-sheet-snap tests passed');
}

runTests();
