/**
 * Unit tests for core/workdayCoordinator.ts
 *
 * Run with: npx tsx core/workdayCoordinator.test.ts
 */

import assert from 'node:assert/strict';

import {
  __resetForTests,
  completeVisit,
  getState,
  reset,
  setCurrentStore,
  setPhase,
  setStopProgress,
  setTrackedMiles,
  setWorkdayContext,
  startVisit,
  subscribe,
} from './workdayCoordinator';

function runTests(): void {
  __resetForTests();

  const initial = getState();
  assert.equal(initial.phase, 'idle');
  assert.equal(initial.activeWorkdayId, null);
  assert.equal(initial.completedStopCount, 0);
  assert.equal(initial.trackedMiles, 0);
  assert.equal(initial.visitStartedAt, null);
  assert.equal(Object.isFrozen(initial), true);

  let subscriptionCalls = 0;
  let lastSeenPhase = '';

  const unsubscribe = subscribe((nextState) => {
    subscriptionCalls += 1;
    lastSeenPhase = nextState.phase;
    assert.equal(Object.isFrozen(nextState), true);
  });

  assert.equal(subscriptionCalls, 1, 'subscribe should invoke listener immediately');

  setPhase('ready');
  assert.equal(subscriptionCalls, 2);
  assert.equal(lastSeenPhase, 'ready');

  const beforeNoOp = subscriptionCalls;
  setPhase('ready');
  assert.equal(subscriptionCalls, beforeNoOp, 'identical phase updates should not notify');

  unsubscribe();
  setPhase('driving');
  assert.equal(subscriptionCalls, beforeNoOp, 'unsubscribed listener should not fire again');
  unsubscribe();

  __resetForTests();

  const snapshot = getState();
  assert.throws(() => {
    (snapshot as { phase: string }).phase = 'finished';
  });
  setPhase('arrived');
  assert.equal(getState().phase, 'arrived');

  let goodListenerCalls = 0;
  subscribe(() => {
    throw new Error('listener boom');
  });
  subscribe(() => {
    goodListenerCalls += 1;
  });

  const beforeDriving = goodListenerCalls;
  setPhase('driving');
  assert.equal(
    goodListenerCalls,
    beforeDriving + 1,
    'non-throwing listeners still receive updates',
  );

  __resetForTests();

  setCurrentStore({
    storeId: 'store-1',
    storeName: 'Harbor Market',
    stopIndex: 3,
  });

  const withStore = getState();
  assert.equal(withStore.currentStoreId, 'store-1');
  assert.equal(withStore.currentStoreName, 'Harbor Market');
  assert.equal(withStore.currentStopIndex, 3);

  setCurrentStore(null);
  assert.equal(getState().currentStoreId, null);
  assert.equal(getState().currentStoreName, null);
  assert.equal(getState().currentStopIndex, null);

  setStopProgress({ completedStopCount: 99, totalStopCount: 6 });
  assert.equal(getState().completedStopCount, 6);

  setStopProgress({ completedStopCount: -2, totalStopCount: 6 });
  assert.equal(getState().completedStopCount, 0);

  setStopProgress({ completedStopCount: 2.9, totalStopCount: 6.8 });
  assert.equal(getState().completedStopCount, 2);
  assert.equal(getState().totalStopCount, 6);

  setTrackedMiles(Number.NaN);
  assert.equal(getState().trackedMiles, 0);

  setTrackedMiles(Number.POSITIVE_INFINITY);
  assert.equal(getState().trackedMiles, 0);

  setTrackedMiles(-4.5);
  assert.equal(getState().trackedMiles, 0);

  setTrackedMiles(12.34);
  assert.equal(getState().trackedMiles, 12.34);

  setWorkdayContext({ activeWorkdayId: 'trip-123', totalStopCount: 6 });
  setStopProgress({ completedStopCount: 1, totalStopCount: 6 });

  startVisit('2026-07-17T20:00:00.000Z');
  const afterVisit = getState();
  assert.equal(afterVisit.visitStartedAt, '2026-07-17T20:00:00.000Z');
  assert.equal(afterVisit.phase, 'checkedIn');

  completeVisit();
  const afterComplete = getState();
  assert.equal(afterComplete.visitStartedAt, null);
  assert.equal(afterComplete.phase, 'completingVisit');
  assert.equal(
    afterComplete.completedStopCount,
    1,
    'completeVisit must not auto-increment stop progress',
  );

  completeVisit();
  assert.equal(
    getState().completedStopCount,
    1,
    'repeated completeVisit must not increment stop progress',
  );

  setStopProgress({ completedStopCount: 2, totalStopCount: 6 });
  assert.equal(getState().completedStopCount, 2);

  let subscriberA = 0;
  let subscriberB = 0;
  subscribe(() => {
    subscriberA += 1;
  });
  subscribe(() => {
    subscriberB += 1;
  });

  setPhase('advancing');
  assert.equal(subscriberA, 2);
  assert.equal(subscriberB, 2);

  const previous = getState();
  setPhase('finished');
  const next = getState();
  assert.notEqual(previous, next, 'state updates should produce new snapshots');

  const finishedAt = Date.parse(getState().updatedAt);
  reset();
  const resetState = getState();
  assert.equal(resetState.phase, 'idle');
  assert.equal(resetState.activeWorkdayId, null);
  assert.equal(resetState.currentStoreId, null);
  assert.equal(resetState.completedStopCount, 0);
  assert.equal(resetState.trackedMiles, 0);
  assert.ok(
    Date.parse(resetState.updatedAt) >= finishedAt,
    'reset must refresh updatedAt',
  );

  console.log('workdayCoordinator tests passed');
}

runTests();
