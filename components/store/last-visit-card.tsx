import { StyleSheet, Text } from 'react-native';

import { StoreOverviewCard } from '@/components/store/store-overview-card';
import { AppColors } from '@/components/shared/app-theme';
import type { StoreVisit } from '@/types/store-visit';
import {
  formatCompletionTimeLabel,
  formatRelativeVisitAge,
  formatVisitDateLabel,
} from '@/utils/store-visit-presentation';

type LastVisitCardProps = {
  lastCompletedVisit: StoreVisit | null;
};

export function LastVisitCard({ lastCompletedVisit }: LastVisitCardProps) {
  if (!lastCompletedVisit?.completedAt) {
    return (
      <StoreOverviewCard title="Last Visit">
        <Text style={styles.emptyText}>No previous visits</Text>
      </StoreOverviewCard>
    );
  }

  const completionTime = formatCompletionTimeLabel(lastCompletedVisit.completedAt);
  const relativeLabel = formatRelativeVisitAge(lastCompletedVisit.completedAt);

  return (
    <StoreOverviewCard title="Last Visit">
      <Text style={styles.dateText}>
        {formatVisitDateLabel(lastCompletedVisit.completedAt)}
      </Text>
      {completionTime ? (
        <Text style={styles.timeText}>Completed {completionTime}</Text>
      ) : null}
      {relativeLabel ? (
        <Text style={styles.relativeText}>{relativeLabel}</Text>
      ) : null}
    </StoreOverviewCard>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  dateText: {
    color: AppColors.textPrimary,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 24,
  },
  timeText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  relativeText: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
