/**
 * Presentation rules for manual check-in entry points on the Current Stop card.
 * Check-in must only be triggered via an explicit check-in action label.
 */
export function shouldShowManualCheckInButton(input: {
  autoCheckInMode: 'automatic' | 'ask' | 'manual';
  isAutomaticCheckInPending: boolean;
  phase: 'not_arrived' | 'arrived' | 'visit_in_progress';
  showAskPrompt: boolean;
  visitStatus: 'pending' | 'current' | 'checked_in' | 'completed' | 'skipped';
}): boolean {
  const canManualCheckIn =
    (input.visitStatus === 'pending' || input.visitStatus === 'current') &&
    !input.isAutomaticCheckInPending;

  if (!canManualCheckIn) {
    return false;
  }

  if (
    input.autoCheckInMode === 'automatic' &&
    input.phase === 'arrived' &&
    !input.showAskPrompt
  ) {
    return false;
  }

  return true;
}

export function cardBackgroundTriggersCheckIn(): false {
  return false;
}
