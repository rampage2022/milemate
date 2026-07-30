/**
 * Run with: npx tsx utils/milemate-status.test.ts
 */

import assert from 'node:assert/strict';

import {
  getStatusBackground,
  getStatusColor,
  getStatusLabel,
  getSkipReasonLabel,
  SKIP_REASON_LABELS,
} from '@/utils/milemate-status';
import { AppColors } from '@/components/shared/app-theme';

assert.equal(getStatusColor('completed'), AppColors.green);
assert.equal(getStatusColor('skipped'), '#EA580C');
assert.equal(getStatusColor('delivery'), AppColors.blue);
assert.equal(getStatusColor('issue'), AppColors.red);
assert.equal(getStatusColor('pending'), '#6B7280');
assert.equal(getStatusColor('active'), AppColors.blue);

assert.match(getStatusBackground('completed'), /./);
assert.equal(getStatusLabel('completed'), 'Completed');
assert.equal(getStatusLabel('skipped'), 'Skipped');

assert.equal(getSkipReasonLabel('store_closed'), SKIP_REASON_LABELS.store_closed);

console.log('milemate-status.test.ts: ok');
