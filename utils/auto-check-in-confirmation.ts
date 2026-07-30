export const AUTO_CHECK_IN_BANNER_VISIBLE_MS = 2_750;

export type AutoCheckInConfirmationEvent = {
  visitId: string;
  checkedInAt: number;
  checkInSource: 'manual' | 'automatic' | undefined;
};

export type AutoCheckInConfirmationDecision =
  | 'show'
  | 'duplicate'
  | 'ineligible';

export function buildAutoCheckInConfirmationKey(
  visitId: string,
  checkedInAt: number,
): string {
  return `${visitId}:${checkedInAt}`;
}

export function isEligibleAutoCheckInConfirmationEvent(
  event: AutoCheckInConfirmationEvent,
): boolean {
  return (
    event.checkInSource === 'automatic' &&
    typeof event.checkedInAt === 'number' &&
    Number.isFinite(event.checkedInAt)
  );
}

export function logAutoCheckInConfirmationDev(
  message: string,
  detail?: unknown,
): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (detail !== undefined) {
      console.log(`[auto-check-in-confirmation] ${message}`, detail);
    } else {
      console.log(`[auto-check-in-confirmation] ${message}`);
    }
  }
}

export function createAutoCheckInConfirmationTracker() {
  const shownConfirmationKeys = new Set<string>();

  function evaluateConfirmation(
    event: AutoCheckInConfirmationEvent,
  ): AutoCheckInConfirmationDecision {
    logAutoCheckInConfirmationDev('confirmation eligibility checked', event);

    if (!isEligibleAutoCheckInConfirmationEvent(event)) {
      return 'ineligible';
    }

    const key = buildAutoCheckInConfirmationKey(
      event.visitId,
      event.checkedInAt,
    );

    if (shownConfirmationKeys.has(key)) {
      logAutoCheckInConfirmationDev('duplicate confirmation suppressed', key);
      return 'duplicate';
    }

    shownConfirmationKeys.add(key);
    return 'show';
  }

  function reset(): void {
    shownConfirmationKeys.clear();
  }

  return {
    evaluateConfirmation,
    reset,
  };
}

/** Session-scoped tracker for the running app process. */
export const autoCheckInConfirmationTracker =
  createAutoCheckInConfirmationTracker();

/** @internal Resets confirmation suppression between tests. */
export function __resetAutoCheckInConfirmationForTests(): void {
  autoCheckInConfirmationTracker.reset();
}

export function isTodayCoordinatorScreen(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/index' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/' ||
    pathname === '/(tabs)/index'
  );
}

export async function runAutoCheckInSuccessHaptic(
  hapticFn: () => Promise<void>,
): Promise<void> {
  try {
    await hapticFn();
    logAutoCheckInConfirmationDev('haptic fired');
  } catch (error) {
    logAutoCheckInConfirmationDev('confirmation UI error', error);
  }
}
