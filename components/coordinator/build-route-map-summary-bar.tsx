import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { AppColors } from '@/components/shared/app-theme';

type BuildRouteMapSummaryBarProps = {
  attached?: boolean;
  distanceLabel: string;
  onOptimize?: () => void;
  optimizeEnabled?: boolean;
  stopsLabel: string;
  timeLabel: string;
};

export function BuildRouteMapSummaryBar({
  attached = false,
  distanceLabel,
  onOptimize,
  optimizeEnabled = false,
  stopsLabel,
  timeLabel,
}: BuildRouteMapSummaryBarProps) {
  return (
    <View style={[styles.bar, attached && styles.barAttached]}>
      <View style={styles.statsRow}>
        <Ionicons color={AppColors.textSecondary} name="list-outline" size={18} />
        <Text style={styles.statsText}>
          {stopsLabel} • {distanceLabel} • {timeLabel}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Optimize route"
        accessibilityRole="button"
        accessibilityState={{ disabled: !optimizeEnabled }}
        disabled={!optimizeEnabled}
        onPress={onOptimize}
        style={({ pressed }) => [
          styles.optimizeButton,
          !optimizeEnabled && styles.optimizeButtonDisabled,
          pressed && optimizeEnabled && styles.pressed,
        ]}
      >
        <Ionicons
          color={optimizeEnabled ? AppColors.blue : AppColors.textMuted}
          name="sparkles-outline"
          size={16}
        />
        <Text
          style={[
            styles.optimizeText,
            !optimizeEnabled && styles.optimizeTextDisabled,
          ]}
        >
          Optimize
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 14, 20, 0.88)',
    borderColor: AppColors.border,
    borderRadius: BuildRouteLayout.mapSummaryBarRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  barAttached: {
    backgroundColor: AppColors.card,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 0,
    marginHorizontal: 0,
    width: '100%',
  },
  statsRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  statsText: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  optimizeButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  optimizeButtonDisabled: {
    opacity: 0.55,
  },
  optimizeText: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  optimizeTextDisabled: {
    color: AppColors.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
