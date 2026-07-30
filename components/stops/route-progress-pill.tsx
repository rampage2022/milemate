import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import { formatRouteProgressPillLabel } from '@/utils/route-progress-pill-label';

export { formatRouteProgressPillLabel };

type RouteProgressPillProps = {
  completedStops: number;
  totalStops: number;
};

/** Compact route progress for the Stops header (presentation only). */
export function RouteProgressPill({
  completedStops,
  totalStops,
}: RouteProgressPillProps) {
  const label = formatRouteProgressPillLabel(completedStops, totalStops);

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
      style={styles.pill}
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
