import type { CompletionPhase } from '@/contexts/visit-advancement-context';

export type AppNavigationMode = 'standard' | 'workday' | 'completion';

export type AppNavigationModeInput = {
  isRestoring: boolean;
  isWorkdayActive: boolean;
  visitCompletionPhase: CompletionPhase;
};

export function getAppNavigationMode(input: AppNavigationModeInput): AppNavigationMode {
  if (input.isRestoring) {
    return 'standard';
  }

  if (input.isWorkdayActive && input.visitCompletionPhase === 'all_complete') {
    return 'completion';
  }

  if (input.isWorkdayActive) {
    return 'workday';
  }

  return 'standard';
}

export function shouldRenderBottomNavigation(mode: AppNavigationMode): boolean {
  return mode !== 'completion';
}

export function shouldUseWorkdayDock(mode: AppNavigationMode): boolean {
  return mode === 'workday';
}

export function logNavigationModeDev(
  mode: AppNavigationMode,
  visitCompletionPhase: CompletionPhase,
  isWorkdayActive: boolean,
): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  console.log(
    `[Navigation] mode=${mode} workdayActive=${isWorkdayActive} completionPhase=${visitCompletionPhase}`,
  );
}
