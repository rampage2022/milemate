import { StyleSheet, Text, View } from 'react-native';

import { WorkdayActionButton } from '@/components/home/workday-action-button';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';

type NoStopsScheduledProps = {
  isStarting: boolean;
  onStartMileageOnlyDay: () => void;
  permissionDenied: boolean;
};

export function NoStopsScheduled({
  isStarting,
  onStartMileageOnlyDay,
  permissionDenied,
}: NoStopsScheduledProps) {
  const startLabel = isStarting ? 'Starting Day…' : 'Start Mileage-Only Day';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Nothing scheduled today</Text>
        <Text style={styles.body}>
          There are no stops assigned for today.
        </Text>
      </View>

      {permissionDenied ? (
        <Text style={styles.error}>
          Location access is required to track your workday.
        </Text>
      ) : null}

      <WorkdayActionButton
        accessibilityLabel={startLabel}
        disabled={isStarting}
        label={startLabel}
        onPress={onStartMileageOnlyDay}
        variant="start"
      />

      <Text style={styles.hintText}>
        Mileage tracking works without scheduled stops.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppSpacing.sectionGap,
  },
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: AppColors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  error: {
    color: AppColors.red,
    fontSize: 15,
    textAlign: 'center',
  },
  hintText: {
    color: AppColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
