import { StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';

type WorkdayCompleteCardProps = {
  completedCount: number;
  totalCount: number;
};

export function WorkdayCompleteCard({
  completedCount,
  totalCount,
}: WorkdayCompleteCardProps) {
  return (
    <View
      accessibilityLabel={`Workday complete. ${completedCount} of ${totalCount} stops completed.`}
      accessibilityRole="summary"
      style={styles.card}
    >
      <Text style={styles.title}>Workday Complete</Text>
      <Text style={styles.body}>
        {completedCount} of {totalCount}{' '}
        {totalCount === 1 ? 'stop' : 'stops'} completed
      </Text>
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
});
