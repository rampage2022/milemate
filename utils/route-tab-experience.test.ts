import assert from 'node:assert/strict';
import test from 'node:test';

import type { StoreVisit } from '@/types/store-visit';

import { shouldShowRouteEntryLauncher } from './route-tab-experience';

function visit(status: StoreVisit['status']): StoreVisit {
  return {
    id: 'v1',
    storeId: 's1',
    scheduledDate: '2026-07-25',
    routeOrder: 1,
    status,
    notes: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

const baseInput = {
  isAddingStopsDuringWorkday: false,
  isLoading: false,
  isRestoring: false,
  isWorkdayActive: false,
  planningPhase: 'planning' as const,
  routePlanningSessionOpen: false,
  visits: [] as StoreVisit[],
};

test('entry launcher when no visit stops and no planning session', () => {
  assert.equal(shouldShowRouteEntryLauncher(baseInput), true);
});

test('planning canvas when session open with blank route', () => {
  assert.equal(
    shouldShowRouteEntryLauncher({
      ...baseInput,
      routePlanningSessionOpen: true,
    }),
    false,
  );
});

test('entry launcher after finished workday even if visit rows remain', () => {
  assert.equal(
    shouldShowRouteEntryLauncher({
      ...baseInput,
      visits: [visit('completed')],
    }),
    true,
  );
});

test('no entry launcher while route has pending visit stops', () => {
  assert.equal(
    shouldShowRouteEntryLauncher({
      ...baseInput,
      visits: [visit('pending')],
    }),
    false,
  );
});

test('no entry launcher during briefing with visit stops', () => {
  assert.equal(
    shouldShowRouteEntryLauncher({
      ...baseInput,
      planningPhase: 'briefing',
      visits: [visit('pending')],
    }),
    false,
  );
});

test('entry launcher when briefing phase but zero visit stops', () => {
  assert.equal(
    shouldShowRouteEntryLauncher({
      ...baseInput,
      planningPhase: 'briefing',
      visits: [],
    }),
    true,
  );
});
