/**
 * Run with: npx tsx utils/auto-check-in-confirmation.test.ts
 */

import assert from 'node:assert/strict';

import {
  __resetAutoCheckInConfirmationForTests,
  autoCheckInConfirmationTracker,
  createAutoCheckInConfirmationTracker,
  isEligibleAutoCheckInConfirmationEvent,
  runAutoCheckInSuccessHaptic,
} from '@/utils/auto-check-in-confirmation';

async function runTests(): Promise<void> {
  __resetAutoCheckInConfirmationForTests();

  const tracker = createAutoCheckInConfirmationTracker();
  const automaticEvent = {
    visitId: 'visit-1',
    checkedInAt: 1_700_000_000_000,
    checkInSource: 'automatic' as const,
  };

  assert.equal(
    tracker.evaluateConfirmation(automaticEvent),
    'show',
    'automatic check-in triggers one confirmation',
  );
  assert.equal(
    tracker.evaluateConfirmation(automaticEvent),
    'duplicate',
    'rerender does not trigger duplicate',
  );
  assert.equal(
    tracker.evaluateConfirmation(automaticEvent),
    'duplicate',
    'route refresh does not trigger duplicate',
  );

  assert.equal(
    tracker.evaluateConfirmation({
      ...automaticEvent,
      visitId: 'visit-2',
    }),
    'show',
    'second stop auto check-in triggers its own confirmation',
  );

  assert.equal(
    tracker.evaluateConfirmation({
      visitId: 'visit-3',
      checkedInAt: 1_700_000_000_000,
      checkInSource: 'manual',
    }),
    'ineligible',
    'manual check-in does not trigger auto confirmation',
  );

  assert.equal(
    isEligibleAutoCheckInConfirmationEvent({
      visitId: 'visit-dwell',
      checkedInAt: Date.now(),
      checkInSource: 'automatic',
    }),
    true,
    'eligibility is based on check-in source, not dwell events',
  );

  assert.equal(
    autoCheckInConfirmationTracker.evaluateConfirmation({
      visitId: 'visit-restore',
      checkedInAt: 1_700_000_111_000,
      checkInSource: 'automatic',
    }),
    'show',
  );
  assert.equal(
    autoCheckInConfirmationTracker.evaluateConfirmation({
      visitId: 'visit-restore',
      checkedInAt: 1_700_000_111_000,
      checkInSource: 'automatic',
    }),
    'duplicate',
    'already confirmed visit does not replay banner',
  );

  const freshTracker = createAutoCheckInConfirmationTracker();
  assert.equal(
    freshTracker.evaluateConfirmation({
      visitId: 'visit-restore',
      checkedInAt: 1_700_000_111_000,
      checkInSource: 'automatic',
    }),
    'show',
    'new process tracker is empty; UI must not call evaluate on hydrate-only restore',
  );

  await assert.doesNotReject(
    runAutoCheckInSuccessHaptic(async () => {
      throw new Error('haptic unavailable');
    }),
    'confirmation failure must not throw to check-in flow',
  );

  console.log('auto check-in confirmation tests passed');
}

void runTests();
