import { StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import type { BriefingRouteSummary } from '@/utils/route-endpoints';

type AdaptiveRouteSummaryProps = {
  firstStopName?: string | null;
  stopCount: number;
  summary: BriefingRouteSummary;
};

export function AdaptiveRouteSummary({
  firstStopName = null,
  stopCount,
  summary,
}: AdaptiveRouteSummaryProps) {
  const stopLabel = stopCount === 1 ? '1 Stop' : `${stopCount} Stops`;

  return (
    <View
      accessibilityLabel={`Route. ${summary.startLabel}. ${stopLabel}. ${summary.endLabel}.`}
      accessibilityRole="summary"
      style={styles.card}
    >
      <Text style={styles.title}>Route</Text>

      <View style={styles.routeColumn}>
        <Text style={styles.endpoint}>{summary.startLabel}</Text>
        <Text style={styles.connector}>↓</Text>
        <Text style={styles.stops}>{stopLabel}</Text>
        <Text style={styles.connector}>↓</Text>
        <Text style={styles.endpoint}>{summary.endLabel}</Text>
      </View>

      {firstStopName ? (
        <View style={styles.firstStopRow}>
          <Text style={styles.firstStopLabel}>First stop</Text>
          <Text style={styles.firstStopName}>{firstStopName}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  title: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  routeColumn: {
    alignItems: 'center',
    gap: 4,
  },
  endpoint: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  connector: {
    color: AppColors.textMuted,
    fontSize: 18,
    lineHeight: 22,
  },
  stops: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  firstStopRow: {
    borderTopColor: AppColors.border,
    borderTopWidth: 1,
    gap: 2,
    marginTop: 4,
    paddingTop: 12,
  },
  firstStopLabel: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  firstStopName: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
