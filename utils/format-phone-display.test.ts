import assert from 'node:assert/strict';

import {
  formatPhoneNumberForDisplay,
  phoneDigitsForDialLink,
} from '@/utils/format-phone-display';

function runTests() {
  assert.equal(formatPhoneNumberForDisplay('4694161890'), '469-416-1890');
  assert.equal(formatPhoneNumberForDisplay('(469) 416-1890'), '469-416-1890');
  assert.equal(formatPhoneNumberForDisplay('817-555-0100'), '817-555-0100');
  assert.equal(formatPhoneNumberForDisplay('+1 469 416 1890'), '469-416-1890');
  assert.equal(phoneDigitsForDialLink('469-416-1890'), '14694161890');

  console.log('format-phone-display tests passed');
}

runTests();
