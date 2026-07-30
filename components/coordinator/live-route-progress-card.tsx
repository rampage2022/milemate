import { StyleSheet, Text, View } from 'react-native';

import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { RouteProgressIndicator } from '@/components/coordinator/route-progress-indicator';
import { AppColors } from '@/components/shared/app-theme';
import type { LiveRouteProgressData } from '@/utils/live-route-summary';

type LiveRouteProgressCardProps = {
  progress: LiveRouteProgressData;
};

export function LiveRouteProgressCard({ progress }: LiveRouteProgressCardProps) {
  return (
    <View accessibilityRole="summary" style={styles.card}>
      <Text numberOfLines={1} style={styles.label}>
        {progress.label}
      </Text>
      <Text numberOfLines={1} style={styles.primaryValue}>
        {progress.primaryValue}
      </Text>
      {progress.supportingValue.length > 0 ? (
        <Text numberOfLines={1} style={styles.supportingValue}>
          {progress.supportingValue} on visits
        </Text>
      ) : null}
      <RouteProgressIndicator
        accessibilityLabel={progress.indicator.accessibilityLabel}
        completedStops={progress.indicator.completedStops}
        currentStopIndex={progress.indicator.currentStopIndex}
        totalStops={progress.indicator.totalStops}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: LiveRouteLayout.headerCardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flex: LiveRouteLayout.progressCardFlex,
    gap: 2,
    justifyContent: 'center',
    minHeight: LiveRouteLayout.headerTopRowMinHeight,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  label: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  primaryValue: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 21,
  },
  supportingValue: {
    color: AppColors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
