export type CoordinatorScreenMode =
  | 'loading'
  | 'planning'
  | 'calculating'
  | 'briefing'
  | 'active_workday'
  | 'completed_day';

export function shouldShowPlanningRouteDock(input: {
  hasStops: boolean;
  isAddressEntryActive: boolean;
  isCalculatingRoute: boolean;
  isKeyboardVisible: boolean;
  screenMode: CoordinatorScreenMode;
}): boolean {
  return (
    input.screenMode === 'planning' &&
    !input.isCalculatingRoute &&
    input.hasStops &&
    !input.isAddressEntryActive &&
    !input.isKeyboardVisible
  );
}

export function shouldShowLiveRouteSummary(screenMode: CoordinatorScreenMode): boolean {
  return screenMode === 'active_workday';
}

export function formatVisitCompletionTime(completedAt: number | undefined): string | null {
  if (typeof completedAt !== 'number' || !Number.isFinite(completedAt)) {
    return null;
  }

  return new Date(completedAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
