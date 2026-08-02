import assert from 'node:assert/strict';

import { buildVisitLogReceivingCallout } from '@/utils/visit-log-receiving-callout';

function runTests() {
  assert.deepEqual(
    buildVisitLogReceivingCallout({
      restriction: { type: 'none' },
      nowMinuteOfDay: 600,
    }),
    { visible: false },
  );

  const beforeOpen = buildVisitLogReceivingCallout({
    restriction: { type: 'before', timeMinutes: 14 * 60 },
    nowMinuteOfDay: 13 * 60,
    locale: 'en-US',
  });
  assert.equal(beforeOpen.visible && beforeOpen.label.includes('cutoff ·'), true);

  const beforePassed = buildVisitLogReceivingCallout({
    restriction: { type: 'before', timeMinutes: 14 * 60 },
    nowMinuteOfDay: 15 * 60,
    locale: 'en-US',
  });
  assert.match(beforePassed.visible ? beforePassed.label : '', /cutoff passed/);

  const afterEarly = buildVisitLogReceivingCallout({
    restriction: { type: 'after', timeMinutes: 9 * 60 + 30 },
    nowMinuteOfDay: 8 * 60,
    locale: 'en-US',
  });
  assert.match(afterEarly.visible ? afterEarly.label : '', /Receiving starts/);

  const afterAvailable = buildVisitLogReceivingCallout({
    restriction: { type: 'after', timeMinutes: 9 * 60 + 30 },
    nowMinuteOfDay: 10 * 60,
    locale: 'en-US',
  });
  assert.match(afterAvailable.visible ? afterAvailable.label : '', /Receiving available/);

  const betweenBefore = buildVisitLogReceivingCallout({
    restriction: { type: 'between', startTimeMinutes: 8 * 60, endTimeMinutes: 13 * 60 },
    nowMinuteOfDay: 7 * 60,
    locale: 'en-US',
  });
  assert.match(betweenBefore.visible ? betweenBefore.label : '', /opens at 8:00 AM/);

  const betweenOpen = buildVisitLogReceivingCallout({
    restriction: { type: 'between', startTimeMinutes: 8 * 60, endTimeMinutes: 13 * 60 },
    nowMinuteOfDay: 10 * 60,
    locale: 'en-US',
  });
  assert.match(betweenOpen.visible ? betweenOpen.label : '', /open until 1:00 PM/);

  const betweenClosed = buildVisitLogReceivingCallout({
    restriction: { type: 'between', startTimeMinutes: 8 * 60, endTimeMinutes: 13 * 60 },
    nowMinuteOfDay: 22 * 60 + 43,
    locale: 'en-US',
  });
  assert.match(betweenClosed.visible ? betweenClosed.label : '', /Receiving closed at 1:00 PM/);

  const boundaryEnd = buildVisitLogReceivingCallout({
    restriction: { type: 'between', startTimeMinutes: 8 * 60, endTimeMinutes: 13 * 60 },
    nowMinuteOfDay: 13 * 60,
    locale: 'en-US',
  });
  assert.match(boundaryEnd.visible ? boundaryEnd.label : '', /Receiving closed/);

  console.log('visit-log-receiving-callout tests passed');
}

runTests();
