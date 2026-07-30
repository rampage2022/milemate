import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';

type RouteMapCompactSummaryProps = {
  distanceLabel: string;
  driveTimeLabel: string;
  finishLabel: string;
  stopCount: number;
  variant?: 'overlay' | 'card';
};

export function RouteMapCompactSummary({
  distanceLabel,
  driveTimeLabel,
  finishLabel,
  stopCount,
  variant = 'overlay',
}: RouteMapCompactSummaryProps) {
  const stopLabel = `${stopCount} ${stopCount === 1 ? 'Stop' : 'Stops'}`;

  return (
    <View
      accessibilityRole="summary"
      pointerEvents="none"
      style={[styles.base, variant === 'overlay' ? styles.overlay : styles.card]}
    >
      <View style={styles.row}>
        <Text style={styles.primaryLeft}>{stopLabel}</Text>
        <Text style={styles.primaryRight}>Finish {finishLabel}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.secondaryLeft}>{distanceLabel}</Text>
        <Text style={styles.secondaryRight}>{driveTimeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 12,
    left: 12,
    position: 'absolute',
    right: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primaryLeft: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  primaryRight: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  secondaryLeft: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  secondaryRight: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
