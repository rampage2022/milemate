import { StyleSheet, Text, View } from 'react-native';

import { WorkdayStatColumn } from '@/components/home/workday-stat-column';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import type { WorkdayTrackingStatus } from '@/hooks/use-workday-tracker';

type WorkdayStatusStripProps = {
  distanceMiles: number;
  durationValue: string;
  durationUnit: string;
  isWorkdayActive: boolean;
  trackingDetailText: string;
  trackingStatus: WorkdayTrackingStatus;
  completedStoreCount: number;
  totalStoreCount: number;
};

export function WorkdayStatusStrip({
  completedStoreCount,
  distanceMiles,
  durationUnit,
  durationValue,
  isWorkdayActive,
  totalStoreCount,
  trackingDetailText,
  trackingStatus,
}: WorkdayStatusStripProps) {
  const compactTracking =
    trackingStatus === 'active'
      ? 'GPS active'
      : trackingStatus === 'starting'
        ? 'GPS starting'
        : trackingDetailText;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Workday Status</Text>

      {isWorkdayActive ? (
        <>
          <Text style={styles.compactLine}>
            {distanceMiles.toFixed(1)} mi · {durationValue} {durationUnit} ·{' '}
            {compactTracking}
          </Text>
          <Text style={styles.supportLine}>
            Stores {completedStoreCount}/{totalStoreCount} complete
          </Text>
        </>
      ) : (
        <>
          <View style={styles.statsRow}>
            <WorkdayStatColumn
              icon="time-outline"
              label="Duration"
              unit={durationUnit}
              value={durationValue}
            />
            <View style={styles.statDivider} />
            <WorkdayStatColumn
              icon="navigate-outline"
              label="Distance"
              unit="miles"
              value={distanceMiles.toFixed(2)}
            />
          </View>
          <Text style={styles.supportLine}>{trackingDetailText}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  eyebrow: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  compactLine: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  supportLine: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statDivider: {
    alignSelf: 'stretch',
    backgroundColor: AppColors.border,
    marginHorizontal: 4,
    width: 1,
  },
});
