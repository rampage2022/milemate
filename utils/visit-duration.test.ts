/**
 * Run with: npx tsx utils/visit-duration.test.ts
 */

import assert from 'node:assert/strict';

import {
  computeVisitDurationMs,
  formatVisitDurationLabel,
} from '@/utils/visit-duration';
import type { StoreVisit } from '@/types/store-visit';

function baseVisit(partial: Partial<StoreVisit>): StoreVisit {
  return {
    id: 'v1',
    storeId: 's1',
    scheduledDate: '2026-07-20',
    routeOrder: 1,
    status: 'completed',
    notes: [],
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

assert.equal(
  computeVisitDurationMs(
    baseVisit({
      checkedInAt: 1_000,
      completedAt: 91_000,
      visitDurationMs: 90_000,
    }),
  ),
  90_000,
);

assert.equal(
  formatVisitDurationLabel(
    baseVisit({
      checkedInAt: 0,
      completedAt: 125_000,
    }),
  ),
  '2:05',
);

console.log('visit duration tests passed');
