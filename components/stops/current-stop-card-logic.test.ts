import assert from 'node:assert/strict';

import {
  cardBackgroundTriggersCheckIn,
  shouldShowManualCheckInButton,
} from '@/components/stops/current-stop-card-logic';

assert.equal(cardBackgroundTriggersCheckIn(), false);

assert.equal(
  shouldShowManualCheckInButton({
    autoCheckInMode: 'manual',
    isAutomaticCheckInPending: false,
    phase: 'not_arrived',
    showAskPrompt: false,
    visitStatus: 'current',
  }),
  true,
);

assert.equal(
  shouldShowManualCheckInButton({
    autoCheckInMode: 'automatic',
    isAutomaticCheckInPending: false,
    phase: 'arrived',
    showAskPrompt: false,
    visitStatus: 'current',
  }),
  false,
);

assert.equal(
  shouldShowManualCheckInButton({
    autoCheckInMode: 'automatic',
    isAutomaticCheckInPending: false,
    phase: 'arrived',
    showAskPrompt: true,
    visitStatus: 'current',
  }),
  true,
);

console.log('current-stop-card-logic.test.ts: ok');
