import type { BriefingPresentation } from '@/utils/briefing-presentation';
import type { DailyBriefingSummary } from '@/utils/planned-route-briefing';
import type { AutoCheckInMode } from '@/types/auto-check-in';

export type WorkdayPreviewChecklistItem = {
  id: string;
  label: string;
  ready: boolean;
};

export function buildWorkdayPreviewChecklist(input: {
  autoCheckInMode: AutoCheckInMode;
  presentation: BriefingPresentation;
  stopCount: number;
}): WorkdayPreviewChecklistItem[] {
  const navigationReady =
    input.presentation.routeHealth?.status === 'verified' ||
    input.presentation.routeHealth === null;
  const routeOptimized = input.stopCount > 1;
  const autoCheckInEnabled = input.autoCheckInMode !== 'manual';
  const allStopsLoaded = input.stopCount > 0;

  return [
    {
      id: 'optimized',
      label: input.stopCount <= 1 ? 'Route ready' : 'Route optimized',
      ready: routeOptimized || input.stopCount <= 1,
    },
    { id: 'auto-check-in', label: 'Auto check-in enabled', ready: autoCheckInEnabled },
    { id: 'navigation', label: 'Navigation ready', ready: navigationReady },
    { id: 'stops-loaded', label: 'All stops loaded', ready: allStopsLoaded },
  ];
}

export function formatWorkdayPreviewStartTime(date = new Date()): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function buildWorkdayPreviewStatLabels(summary: DailyBriefingSummary): {
  mileagePrimary: string;
  mileageSubtitle: string;
  stopsPrimary: string;
  stopsSubtitle: string;
  timePrimary: string;
  timeSubtitle: string;
} {
  return {
    stopsPrimary: String(summary.stopCount),
    stopsSubtitle: 'On today\u2019s route',
    mileagePrimary: summary.estimatedDistanceLabel,
    mileageSubtitle: 'Total for the day',
    timePrimary: summary.estimatedDriveTimeLabel,
    timeSubtitle: 'Including visits',
  };
}
