import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StoreOverviewCard } from '@/components/store/store-overview-card';
import { VisitStatusBadge } from '@/components/shared/visit-status-badge';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import {
  AfterCompletionIcons,
  AfterCompletionLabels,
  type AfterCompletionMode,
} from '@/types/after-completion';
import type { StoreVisit } from '@/types/store-visit';
import {
  formatCheckInTimeLabel,
  formatCompletionTimeLabel,
} from '@/utils/store-visit-presentation';
import { formatVisitDurationLabel } from '@/utils/visit-duration';
import { useVisitElapsedMs } from '@/hooks/use-visit-elapsed-ms';
import { formatDurationDisplay } from '@/components/home/format-workday';

type TodaysVisitCardProps = {
  afterCompletionMode: AfterCompletionMode;
  isCompletionActive: boolean;
  isSaving: boolean;
  onCheckIn: () => void;
  onCompleteVisit: () => void;
  onCycleAfterCompletion: () => void;
  visit: StoreVisit | null;
};

function visitStatusHeadline(status: StoreVisit['status'] | null): string {
  if (!status) {
    return 'No visit scheduled';
  }

  if (status === 'completed') {
    return 'Completed';
  }

  if (status === 'checked_in') {
    return 'Checked In';
  }

  if (status === 'skipped') {
    return 'Skipped';
  }

  return 'Pending';
}

export function TodaysVisitCard({
  afterCompletionMode,
  isCompletionActive,
  isSaving,
  onCheckIn,
  onCompleteVisit,
  onCycleAfterCompletion,
  visit,
}: TodaysVisitCardProps) {
  const canCheckIn = visit?.status === 'pending' || visit?.status === 'current';
  const canComplete = visit?.status === 'current' || visit?.status === 'checked_in';
  const checkInTime = formatCheckInTimeLabel(visit?.checkedInAt);
  const completionTime = formatCompletionTimeLabel(visit?.completedAt);
  const elapsedMs = useVisitElapsedMs(
    visit?.status === 'checked_in' ? visit.checkedInAt : undefined,
  );
  const visitDurationLabel =
    visit && visit.status === 'completed'
      ? formatVisitDurationLabel(visit)
      : null;

  return (
    <StoreOverviewCard title="Today's Visit">
      {!visit ? (
        <Text style={styles.bodyText}>No visit scheduled for today.</Text>
      ) : (
        <>
          <View style={styles.statusRow}>
            <Text style={styles.statusHeadline}>{visitStatusHeadline(visit.status)}</Text>
            <VisitStatusBadge status={visit.status} />
          </View>

          {visit.status === 'checked_in' && checkInTime ? (
            <Text style={styles.metaText}>Checked in at {checkInTime}</Text>
          ) : null}

          {visit.status === 'checked_in' && elapsedMs !== null ? (
            <Text style={styles.metaText}>
              Visit time {formatDurationDisplay(elapsedMs).value}
            </Text>
          ) : null}

          {visit.status === 'completed' && completionTime ? (
            <Text style={styles.metaText}>Completed {completionTime}</Text>
          ) : null}

          {visit.status === 'completed' && visitDurationLabel ? (
            <Text style={styles.metaText}>Duration {visitDurationLabel}</Text>
          ) : null}

          {canComplete ? (
            <Pressable
              onPress={onCycleAfterCompletion}
              style={styles.afterCompletionRow}
            >
              <Text style={styles.afterCompletionLabel}>After Completion</Text>
              <Text style={styles.afterCompletionValue}>
                {AfterCompletionIcons[afterCompletionMode]}{' '}
                {AfterCompletionLabels[afterCompletionMode]}
              </Text>
            </Pressable>
          ) : null}

          {canCheckIn ? (
            <Pressable
              disabled={isSaving}
              onPress={onCheckIn}
              style={styles.checkInButton}
            >
              <Text style={styles.checkInText}>Check In</Text>
            </Pressable>
          ) : null}

          {canComplete ? (
            <Pressable
              disabled={isSaving || isCompletionActive}
              onPress={onCompleteVisit}
              style={styles.completeButton}
            >
              <Text style={styles.completeText}>Complete Visit</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </StoreOverviewCard>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  statusHeadline: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  metaText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  afterCompletionRow: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  afterCompletionLabel: {
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  afterCompletionValue: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  checkInButton: {
    alignItems: 'center',
    backgroundColor: AppColors.startButton,
    borderRadius: AppSpacing.buttonRadius,
    justifyContent: 'center',
    minHeight: 48,
  },
  checkInText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  completeButton: {
    alignItems: 'center',
    backgroundColor: AppColors.green,
    borderRadius: AppSpacing.buttonRadius,
    justifyContent: 'center',
    minHeight: 48,
  },
  completeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
