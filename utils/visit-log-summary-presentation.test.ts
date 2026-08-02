/**
 * Run with: npx tsx utils/visit-log-summary-presentation.test.ts
 */

import assert from 'node:assert/strict';

import type { Store } from '@/types/store';
import {
  buildVisitLogOperationalRows,
  resolveVisitLogManagerDisplayName,
} from '@/utils/visit-log-summary-presentation';

function baseStore(partial: Partial<Store>): Store {
  return {
    id: 'store-1',
    name: 'Demo',
    addressLine1: '1 Main',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

const noHours = buildVisitLogOperationalRows({ store: baseStore({}), managerName: undefined });
assert.equal(noHours.showStoreStatusRow, false);
assert.equal(noHours.showManagerRow, false);
assert.equal(noHours.showOperationalDivider, false);

const withHours = buildVisitLogOperationalRows({
  store: baseStore({
    operatingHours: { openMinutes: 8 * 60, closeMinutes: 22 * 60 },
  }),
  managerName: undefined,
  nowMinuteOfDay: 10 * 60,
});
assert.equal(withHours.showStoreStatusRow, true);
assert.equal(withHours.storeOpenStatus.kind, 'open');

assert.equal(resolveVisitLogManagerDisplayName('  Pat  '), 'Pat');
assert.equal(resolveVisitLogManagerDisplayName(''), null);
assert.equal(resolveVisitLogManagerDisplayName(undefined), null);

const managerOnly = buildVisitLogOperationalRows({
  store: baseStore({}),
  managerName: 'Alex',
});
assert.equal(managerOnly.showManagerRow, true);
assert.equal(managerOnly.showOperationalDivider, true);

const managerAndHours = buildVisitLogOperationalRows({
  store: baseStore({
    operatingHours: { openMinutes: 8 * 60, closeMinutes: 22 * 60 },
  }),
  managerName: 'Alex',
});
assert.equal(managerAndHours.showOperationalDivider, true);

const phoneOnly = buildVisitLogOperationalRows({
  store: baseStore({ managerPhone: '5555555555' }),
  managerName: undefined,
});
assert.equal(phoneOnly.showManagerRow, true);

console.log('visit-log-summary-presentation tests passed');
