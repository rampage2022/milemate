/**
 * Run with: npx tsx utils/visit-history.test.ts
 */

import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildVisitHistoryItems,
  buildVisitHistorySections,
  buildDefaultSectionExpansion,
  isResolvedVisit,
  mapVisitToHistoryItem,
  matchesVisitHistoryFilter,
} from '@/utils/visit-history';

function visit(
  overrides: Partial<StoreVisit> & Pick<StoreVisit, 'id' | 'status'>,
): StoreVisit {
  return {
    storeId: 'store-1',
    scheduledDate: '2026-07-22',
    routeOrder: 1,
    notes: [],
    createdAt: 1,
    updatedAt: 100,
    completedAt: overrides.status === 'completed' ? 500 : undefined,
    ...overrides,
  };
}

const store: Store = {
  id: 'store-1',
  name: 'Tom Thumb #1842',
  addressLine1: '123 Main Street',
  city: 'Arlington',
  state: 'TX',
  postalCode: '76010',
  createdAt: 1,
  updatedAt: 1,
};

assert.equal(isResolvedVisit(visit({ id: 'a', status: 'pending' })), false);
assert.equal(isResolvedVisit(visit({ id: 'b', status: 'current' })), false);
assert.equal(isResolvedVisit(visit({ id: 'c', status: 'completed' })), true);
assert.equal(isResolvedVisit(visit({ id: 'd', status: 'skipped' })), true);

assert.equal(mapVisitToHistoryItem(visit({ id: 'p', status: 'pending' }), store), null);

const completedItem = mapVisitToHistoryItem(
  visit({ id: 'c', status: 'completed', completedAt: 900 }),
  store,
)!;

assert.equal(completedItem.storeName, 'Tom Thumb #1842');
assert.equal(completedItem.status, 'completed');
assert.equal(completedItem.reason, 'Completed');

const skippedItem = mapVisitToHistoryItem(
  visit({
    id: 's',
    status: 'skipped',
    skipReason: 'store_closed',
    completedAt: undefined,
    updatedAt: 800,
  }),
  store,
)!;

assert.equal(skippedItem.reason, 'Store Closed');

const items = buildVisitHistoryItems(
  [
    visit({ id: '1', status: 'completed', completedAt: 300, routeOrder: 1 }),
    visit({ id: '2', status: 'completed', completedAt: 900, routeOrder: 2 }),
    visit({ id: '3', status: 'pending', routeOrder: 3 }),
  ],
  { 'store-1': store },
);

assert.equal(items.length, 2);
assert.equal(items[0]?.id, '2', 'newest resolved visit first');

const sections = buildVisitHistorySections({
  filter: 'all',
  items,
  selectedDateKey: null,
  todayKey: '2026-07-22',
});

assert.equal(sections.length, 1);
assert.equal(sections[0]?.title, 'Today');

const expansion = buildDefaultSectionExpansion(sections, '2026-07-22');
assert.equal(expansion['2026-07-22'], true);

assert.equal(
  matchesVisitHistoryFilter({ ...completedItem, hasIssue: false }, 'completed'),
  true,
);
assert.equal(
  matchesVisitHistoryFilter({ ...skippedItem, hasIssue: false }, 'skipped'),
  true,
);

const withNotes = mapVisitToHistoryItem(
  visit({ id: 'n', status: 'completed', notes: [{ id: 'n1', text: 'Issue', createdAt: 1 }] }),
  store,
)!;

assert.equal(withNotes.hasIssue, true);
assert.equal(matchesVisitHistoryFilter(withNotes, 'issues'), true);

console.log('visit-history.test.ts: ok');
