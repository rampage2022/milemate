import Ionicons from '@expo/vector-icons/Ionicons';

import { AppColors } from '@/components/shared/app-theme';
import type { StoreVisitStatus } from '@/types/store-visit';
import type { VisitSkipReason } from '@/types/store-visit';

export type MileMateStatusTone =
  | 'completed'
  | 'skipped'
  | 'delivery'
  | 'issue'
  | 'pending'
  | 'active';

export type MileMateStatusPresentation = {
  accessibilityLabel: string;
  backgroundColor: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: MileMateStatusTone;
};

const SKIPPED_ORANGE = '#EA580C';
const SKIPPED_ORANGE_SOFT = '#FFEDD5';
const PENDING_GRAY = '#6B7280';
const PENDING_GRAY_SOFT = '#F3F4F6';
const ISSUE_RED = AppColors.red;
const ISSUE_RED_SOFT = '#FEE2E2';
const DELIVERY_BLUE = AppColors.blue;
const DELIVERY_BLUE_SOFT = '#DBEAFE';

const TONE_PRESENTATION: Record<
  MileMateStatusTone,
  Omit<MileMateStatusPresentation, 'accessibilityLabel' | 'label'> & { label: string }
> = {
  completed: {
    tone: 'completed',
    label: 'Completed',
    color: AppColors.green,
    backgroundColor: AppColors.greenSoft,
    icon: 'checkmark-circle',
  },
  skipped: {
    tone: 'skipped',
    label: 'Skipped',
    color: SKIPPED_ORANGE,
    backgroundColor: SKIPPED_ORANGE_SOFT,
    icon: 'arrow-forward-circle-outline',
  },
  delivery: {
    tone: 'delivery',
    label: 'Delivery',
    color: DELIVERY_BLUE,
    backgroundColor: DELIVERY_BLUE_SOFT,
    icon: 'cube-outline',
  },
  issue: {
    tone: 'issue',
    label: 'Issue',
    color: ISSUE_RED,
    backgroundColor: ISSUE_RED_SOFT,
    icon: 'alert-circle',
  },
  pending: {
    tone: 'pending',
    label: 'Pending',
    color: PENDING_GRAY,
    backgroundColor: PENDING_GRAY_SOFT,
    icon: 'ellipse-outline',
  },
  active: {
    tone: 'active',
    label: 'Current stop',
    color: AppColors.blue,
    backgroundColor: DELIVERY_BLUE_SOFT,
    icon: 'navigate-circle',
  },
};

export const SKIP_REASON_LABELS: Record<VisitSkipReason, string> = {
  store_closed: 'Store Closed',
  no_delivery: 'No Delivery',
  return_later: 'Return Later',
  time_constraint: 'Time Constraint',
  route_changed: 'Route Changed',
  other: 'Other',
};

export function getStatusColor(tone: MileMateStatusTone): string {
  return TONE_PRESENTATION[tone].color;
}

export function getStatusBackground(tone: MileMateStatusTone): string {
  return TONE_PRESENTATION[tone].backgroundColor;
}

export function getStatusIcon(tone: MileMateStatusTone): keyof typeof Ionicons.glyphMap {
  return TONE_PRESENTATION[tone].icon;
}

export function getStatusLabel(tone: MileMateStatusTone): string {
  return TONE_PRESENTATION[tone].label;
}

export function getSkipReasonLabel(reason: VisitSkipReason | undefined): string | null {
  if (!reason) {
    return null;
  }

  return SKIP_REASON_LABELS[reason] ?? null;
}

export function getVisitStatusTone(
  status: StoreVisitStatus,
  options?: { hasIssueNotes?: boolean },
): MileMateStatusTone {
  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'skipped') {
    return 'skipped';
  }

  if (status === 'current' || status === 'checked_in') {
    return 'active';
  }

  if (options?.hasIssueNotes) {
    return 'issue';
  }

  return 'pending';
}

export function getVisitHistoryRowStatusLabel(input: {
  skipReason?: VisitSkipReason;
  status: 'completed' | 'skipped' | 'issue';
}): string {
  if (input.status === 'completed') {
    return 'Completed';
  }

  if (input.status === 'issue') {
    return 'Issue';
  }

  const reasonLabel = getSkipReasonLabel(input.skipReason);

  return reasonLabel ?? 'Skipped';
}

export function buildStatusPresentation(input: {
  label?: string;
  tone: MileMateStatusTone;
}): MileMateStatusPresentation {
  const base = TONE_PRESENTATION[input.tone];
  const label = input.label ?? base.label;

  return {
    ...base,
    label,
    accessibilityLabel: `${label}, ${input.tone} status`,
  };
}

export function mapStoreVisitStatusToPresentation(
  status: StoreVisitStatus,
): MileMateStatusPresentation {
  const tone = getVisitStatusTone(status);
  return buildStatusPresentation({ tone });
}
