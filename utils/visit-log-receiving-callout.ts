import type { StoreReceivingRestriction } from '@/types/store-receiving-restriction';
import { formatMinutesOfDayForDisplay } from '@/utils/store-receiving-restriction';
import { getLocalMinuteOfDay, isMinuteInSameDayRange } from '@/utils/minute-of-day';

export type VisitLogReceivingEmphasis = 'neutral' | 'available' | 'passed';

export type VisitLogReceivingCallout = {
  accessibilityLabel: string;
  emphasis: VisitLogReceivingEmphasis;
  label: string;
  visible: true;
};

export type VisitLogReceivingCalloutResult =
  | { visible: false }
  | VisitLogReceivingCallout;

export function buildVisitLogReceivingCallout(input: {
  locale?: string | string[];
  nowMinuteOfDay?: number;
  restriction: StoreReceivingRestriction;
}): VisitLogReceivingCalloutResult {
  const now = input.nowMinuteOfDay ?? getLocalMinuteOfDay();
  const restriction = input.restriction;
  const locale = input.locale;

  if (restriction.type === 'none') {
    return { visible: false };
  }

  if (restriction.type === 'before') {
    const timeLabel = formatMinutesOfDayForDisplay(restriction.timeMinutes, locale);

    if (now < restriction.timeMinutes) {
      return {
        visible: true,
        emphasis: 'neutral',
        label: `Receiving cutoff · ${timeLabel}`,
        accessibilityLabel: `Receiving cutoff at ${timeLabel}`,
      };
    }

    return {
      visible: true,
      emphasis: 'passed',
      label: `Receiving cutoff passed · ${timeLabel}`,
      accessibilityLabel: `Receiving cutoff passed at ${timeLabel}`,
    };
  }

  if (restriction.type === 'after') {
    const timeLabel = formatMinutesOfDayForDisplay(restriction.timeMinutes, locale);

    if (now < restriction.timeMinutes) {
      return {
        visible: true,
        emphasis: 'neutral',
        label: `Receiving starts · ${timeLabel}`,
        accessibilityLabel: `Receiving starts at ${timeLabel}`,
      };
    }

    return {
      visible: true,
      emphasis: 'available',
      label: `Receiving available · After ${timeLabel}`,
      accessibilityLabel: `Receiving available after ${timeLabel}`,
    };
  }

  const startLabel = formatMinutesOfDayForDisplay(restriction.startTimeMinutes, locale);
  const endLabel = formatMinutesOfDayForDisplay(restriction.endTimeMinutes, locale);

  if (now < restriction.startTimeMinutes) {
    return {
      visible: true,
      emphasis: 'neutral',
      label: `Receiving opens at ${startLabel}`,
      accessibilityLabel: `Receiving opens at ${startLabel}`,
    };
  }

  if (
    isMinuteInSameDayRange(
      now,
      restriction.startTimeMinutes,
      restriction.endTimeMinutes,
    )
  ) {
    return {
      visible: true,
      emphasis: 'available',
      label: `Receiving open until ${endLabel}`,
      accessibilityLabel: `Receiving open until ${endLabel}`,
    };
  }

  return {
    visible: true,
    emphasis: 'passed',
    label: `Receiving closed at ${endLabel}`,
    accessibilityLabel: `Receiving closed at ${endLabel}`,
  };
}

/** True when receiving window/cutoff has passed (for skip suggestions). */
export function isReceivingRestrictionPassedForSkip(input: {
  nowMinuteOfDay: number;
  restriction: StoreReceivingRestriction;
}): boolean {
  const callout = buildVisitLogReceivingCallout({
    restriction: input.restriction,
    nowMinuteOfDay: input.nowMinuteOfDay,
  });

  if (!callout.visible) {
    return false;
  }

  return callout.emphasis === 'passed';
}
