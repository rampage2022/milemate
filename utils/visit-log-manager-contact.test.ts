/**
 * Run with: npx tsx utils/visit-log-manager-contact.test.ts
 */

import assert from 'node:assert/strict';

import {
  buildVisitLogManagerContactPresentation,
  resolveManagerPhoneTypeForSave,
} from '@/utils/visit-log-manager-contact';

assert.equal(
  resolveManagerPhoneTypeForSave({
    existingPhone: undefined,
    existingType: undefined,
    nextPhone: '5551112222',
    selectedType: null,
  }),
  'mobile',
);

assert.equal(
  resolveManagerPhoneTypeForSave({
    existingPhone: '5551112222',
    existingType: undefined,
    nextPhone: '5551112222',
    selectedType: null,
  }),
  undefined,
);

assert.equal(
  resolveManagerPhoneTypeForSave({
    existingPhone: '5551112222',
    existingType: undefined,
    nextPhone: '5551112222',
    selectedType: 'mobile',
  }),
  'mobile',
);

const legacy = buildVisitLogManagerContactPresentation({
  managerName: 'Test',
  managerPhone: '5551112222',
});
assert.equal(legacy.showCall, true);
assert.equal(legacy.showMessage, false);

const mobile = buildVisitLogManagerContactPresentation({
  managerName: 'Test',
  managerPhone: '5551112222',
  managerPhoneType: 'mobile',
});
assert.equal(mobile.showCall, true);
assert.equal(mobile.showMessage, true);

const other = buildVisitLogManagerContactPresentation({
  managerName: 'Test',
  managerPhone: '5551112222',
  managerPhoneType: 'other',
});
assert.equal(other.showCall, true);
assert.equal(other.showMessage, false);

const nameOnly = buildVisitLogManagerContactPresentation({
  managerName: 'Test',
});
assert.equal(nameOnly.showRow, true);
assert.equal(nameOnly.showCall, false);
assert.equal(nameOnly.showMessage, false);

const phoneOnly = buildVisitLogManagerContactPresentation({
  managerPhone: '5551112222',
  managerPhoneType: 'other',
});
assert.equal(phoneOnly.displayName, 'Store contact');
assert.equal(phoneOnly.showCall, true);
assert.equal(phoneOnly.showMessage, false);

const empty = buildVisitLogManagerContactPresentation({});
assert.equal(empty.showRow, false);

console.log('visit-log-manager-contact tests passed');
