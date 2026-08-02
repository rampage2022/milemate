import assert from 'node:assert/strict';

import {
  clearStoresMapNavigationIntentForTests,
  consumeStoresMapNavigationIntent,
  getStoresMapEntryReturnContext,
  noteNormalStoresTabEntry,
  shouldShowStoresMapPreviewBackButton,
  shouldShowTabBarOnStoresDuringPreWorkday,
  stageStoresMapNavigationIntent,
} from '@/utils/stores-map-navigation-intent';

function runTests() {
  clearStoresMapNavigationIntentForTests();

  stageStoresMapNavigationIntent({
    scope: 'today',
    smartFilter: 'missed-delivery',
    source: 'workday-preview',
  });

  assert.equal(shouldShowStoresMapPreviewBackButton(), true);
  const consumed = consumeStoresMapNavigationIntent();
  assert.ok(consumed);
  assert.equal(getStoresMapEntryReturnContext()?.returnTo, 'workday-preview');
  assert.equal(shouldShowStoresMapPreviewBackButton(), true);

  clearStoresMapNavigationIntentForTests();
  assert.equal(shouldShowStoresMapPreviewBackButton(), false);

  noteNormalStoresTabEntry();
  clearStoresMapNavigationIntentForTests();
  assert.equal(shouldShowStoresMapPreviewBackButton(), false);

  stageStoresMapNavigationIntent({
    scope: 'today',
    source: 'workday-preview',
    selectedStoreId: 'store-a',
  });
  consumeStoresMapNavigationIntent();
  assert.equal(shouldShowStoresMapPreviewBackButton(), true);

  noteNormalStoresTabEntry();
  assert.equal(shouldShowStoresMapPreviewBackButton(), false);

  stageStoresMapNavigationIntent({ scope: 'today', smartFilter: 'missed-delivery' });
  consumeStoresMapNavigationIntent();
  assert.equal(shouldShowStoresMapPreviewBackButton(), false);

  assert.equal(
    shouldShowTabBarOnStoresDuringPreWorkday({
      pathname: '/stores',
      preWorkdayTabBarHidden: true,
    }),
    true,
  );
  assert.equal(
    shouldShowTabBarOnStoresDuringPreWorkday({
      pathname: '/',
      preWorkdayTabBarHidden: true,
    }),
    false,
  );
  assert.equal(
    shouldShowTabBarOnStoresDuringPreWorkday({
      pathname: '/stores',
      preWorkdayTabBarHidden: false,
    }),
    true,
  );

  console.log('stores-map-contextual-navigation tests passed');
}

runTests();
