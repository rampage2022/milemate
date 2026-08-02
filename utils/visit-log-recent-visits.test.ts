/**
 * Run with: npx tsx utils/visit-log-recent-visits.test.ts
 */

import assert from 'node:assert/strict';

import type { StoreOrder } from '@/types/store-order';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildVisitLogRecentVisits,
  VISIT_LOG_RECENT_VISITS_LIMIT,
} from '@/utils/visit-log-recent-visits';

function visit(partial: Partial<StoreVisit> & Pick<StoreVisit, 'id'>): StoreVisit {
  const now = Date.now();

  return {
    storeId: 'store-a',
    scheduledDate: '2026-07-29',
    routeOrder: 1,
    status: 'completed',
    notes: [],
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    ...partial,
  };
}

const completed = visit({
  id: 'v1',
  status: 'completed',
  completedAt: new Date('2026-07-29T12:00:00').getTime(),
  visitDurationMs: 42 * 60_000,
  notes: [{ id: 'n1', text: 'hi', createdAt: 1 }],
});

const skipped = visit({
  id: 'v2',
  status: 'skipped',
  completedAt: new Date('2026-07-22T12:00:00').getTime(),
  skipReason: 'receiving_closed',
});

const pending = visit({
  id: 'v3',
  status: 'pending',
  completedAt: undefined,
});

const active = visit({
  id: 'v-active',
  status: 'checked_in',
  checkedInAt: Date.now(),
  completedAt: undefined,
});

const result = buildVisitLogRecentVisits({
  activeVisit: active,
  canonicalStoreId: 'store-a',
  orders: [] as StoreOrder[],
  storeIdRemap: new Map([['store-old', 'store-a']]),
  visits: [
    completed,
    skipped,
    pending,
    active,
    visit({
      id: 'v-alias',
      storeId: 'store-old',
      status: 'completed',
      scheduledDate: '2026-07-29',
      completedAt: new Date('2026-07-29T08:00:00').getTime(),
    }),
  ],
});

assert.equal(result.rows.length, 2);
assert.ok(result.rows.every((row) => row.id !== 'v-active'));
assert.ok(result.rows.every((row) => row.id !== 'v3'));
assert.equal(result.rows[0]?.id, 'v1');
assert.match(result.rows[0]?.dateStatusLine ?? '', /Completed/);
assert.match(result.rows[0]?.detailLine ?? '', /42 min/);
assert.match(result.rows[0]?.detailLine ?? '', /1 note/);
assert.equal(result.rows[1]?.status, 'skipped');
assert.match(result.rows[1]?.detailLine ?? '', /Receiving closed/i);

const many = buildVisitLogRecentVisits({
  activeVisit: null,
  canonicalStoreId: 'store-a',
  orders: [],
  storeIdRemap: new Map(),
  visits: Array.from({ length: 5 }, (_, index) =>
    visit({
      id: `v-${index}`,
      completedAt: new Date(`2026-07-${10 + index}T12:00:00`).getTime(),
      scheduledDate: `2026-07-${10 + index}`,
    }),
  ),
});

assert.equal(many.rows.length, VISIT_LOG_RECENT_VISITS_LIMIT);
assert.equal(many.totalMatchingCount, 5);

const empty = buildVisitLogRecentVisits({
  activeVisit: active,
  canonicalStoreId: 'store-a',
  orders: [],
  storeIdRemap: new Map(),
  visits: [active],
});

assert.equal(empty.rows.length, 0);

console.log('visit-log-recent-visits tests passed');
