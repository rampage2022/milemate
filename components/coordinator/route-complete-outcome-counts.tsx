import { StyleSheet, Text, View } from 'react-native';

import { MileMateStatusPill } from '@/components/shared/milemate-status-pill';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteStopOutcomeCounts } from '@/utils/route-resolution';

type RouteCompleteOutcomeCountsProps = {
  outcomes: RouteStopOutcomeCounts;
};

export function RouteCompleteOutcomeCounts({ outcomes }: RouteCompleteOutcomeCountsProps) {
  return (
    <View accessibilityRole="summary" style={styles.row}>
      <View style={styles.cell}>
        <Text style={styles.count}>{outcomes.completed}</Text>
        <MileMateStatusPill label="Completed" tone="completed" />
      </View>
      {outcomes.skipped > 0 ? (
        <View style={styles.cell}>
          <Text style={styles.count}>{outcomes.skipped}</Text>
          <MileMateStatusPill label="Skipped" tone="skipped" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  cell: {
    alignItems: 'center',
    gap: 6,
  },
  count: {
    color: AppColors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
