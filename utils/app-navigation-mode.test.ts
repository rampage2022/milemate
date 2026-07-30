/**
 * Run with: npx tsx utils/app-navigation-mode.test.ts
 */

import assert from 'node:assert/strict';

import {
  getAppNavigationMode,
  shouldRenderBottomNavigation,
  shouldUseWorkdayDock,
} from '@/utils/app-navigation-mode';

function mode(input: Partial<Parameters<typeof getAppNavigationMode>[0]>) {
  return getAppNavigationMode({
    isRestoring: false,
    isWorkdayActive: false,
    visitCompletionPhase: 'idle',
    ...input,
  });
}

assert.equal(mode({}), 'standard', 'idle → standard');

assert.equal(
  mode({ isWorkdayActive: true, visitCompletionPhase: 'idle' }),
  'workday',
  'active workday → workday',
);

assert.equal(
  mode({ isWorkdayActive: true, visitCompletionPhase: 'all_complete' }),
  'completion',
  'route complete → completion',
);

assert.equal(
  mode({ isRestoring: true, isWorkdayActive: true, visitCompletionPhase: 'all_complete' }),
  'standard',
  'restoring uses standard mode label (bar hidden separately)',
);

assert.equal(
  mode({ isWorkdayActive: false, visitCompletionPhase: 'all_complete' }),
  'standard',
  'completion phase without active workday → standard',
);

assert.equal(shouldUseWorkdayDock('workday'), true);
assert.equal(shouldUseWorkdayDock('standard'), false);
assert.equal(shouldUseWorkdayDock('completion'), false);

assert.equal(shouldRenderBottomNavigation('standard'), true);
assert.equal(shouldRenderBottomNavigation('workday'), true);
assert.equal(shouldRenderBottomNavigation('completion'), false);

console.log('app-navigation-mode.test.ts: ok');
