import assert from 'node:assert/strict';

import { formatRouteProgressPillLabel } from '@/utils/route-progress-pill-label';

assert.equal(formatRouteProgressPillLabel(2, 5), '2 / 5 Complete');
assert.equal(formatRouteProgressPillLabel(0, 3), '0 / 3 Complete');

console.log('route-progress-pill.test.ts: ok');
