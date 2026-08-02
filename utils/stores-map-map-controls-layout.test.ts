import assert from 'node:assert/strict';

import {
  computeStoresMapOverlayControlsTop,
  controlsOverlapSelectedStoreCard,
  shouldHideStoresMapOverlayControlsForExpandedSheet,
  shouldShowStoresMapOverlayControls,
  STORES_MAP_OVERLAY_CONTROL_STACK_HEIGHT,
} from '@/utils/stores-map-map-controls-layout';

function runTests() {
  assert.equal(shouldShowStoresMapOverlayControls({ sheetSnap: 'collapsed' }), true);
  assert.equal(shouldShowStoresMapOverlayControls({ sheetSnap: 'medium' }), true);
  assert.equal(shouldHideStoresMapOverlayControlsForExpandedSheet({ sheetSnap: 'expanded' }), true);

  const hostHeight = 700;
  const topInset = 50;
  const collapsed = 92;

  const collapsedTop = computeStoresMapOverlayControlsTop({
    collapsedSheetHeight: collapsed,
    estimatedSelectedCardHeight: 0,
    floatingCardBottom: 12,
    hostHeight,
    mediumSheetHeight: 320,
    selectedStoreCardVisible: false,
    sheetSnap: 'collapsed',
    topInset,
  });

  assert.ok(collapsedTop > topInset);

  const withCardTop = computeStoresMapOverlayControlsTop({
    collapsedSheetHeight: 6,
    estimatedSelectedCardHeight: 260,
    floatingCardBottom: 12,
    hostHeight,
    mediumSheetHeight: 320,
    selectedStoreCardVisible: true,
    sheetSnap: 'collapsed',
    topInset,
  });

  const cardTop = hostHeight - 12 - 260;
  const controlsBottom = withCardTop + STORES_MAP_OVERLAY_CONTROL_STACK_HEIGHT;

  assert.ok(controlsBottom <= cardTop - 4);
  assert.equal(
    controlsOverlapSelectedStoreCard({
      controlsTop: withCardTop,
      estimatedSelectedCardHeight: 260,
      floatingCardBottom: 12,
      hostHeight,
      selectedStoreCardVisible: true,
    }),
    false,
  );

  console.log('stores-map-map-controls-layout tests passed');
}

runTests();
