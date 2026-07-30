import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { AppColors } from '@/components/shared/app-theme';

type BuildRouteMapSummaryBarProps = {
  attached?: boolean;
  distanceLabel: string;
  onOptimize?: () => void;
  optimizeEnabled?: boolean;
  routeScopeHint?: string;
  stopsLabel: string;
  timeLabel: string;
};

export function BuildRouteMapSummaryBar({
  attached = false,
  distanceLabel,
  onOptimize,
  optimizeEnabled = false,
  routeScopeHint,
  stopsLabel,
  timeLabel,
}: BuildRouteMapSummaryBarProps) {
  return (
    <View style={[styles.bar, attached && styles.barAttached]}>
      <View style={styles.contentColumn}>
        <View style={styles.statsRow}>
          <Ionicons color={AppColors.textSecondary} name="list-outline" size={15} />
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.statsText}>
            {stopsLabel} • {distanceLabel} • {timeLabel}
          </Text>
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
              size={14}
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
        {routeScopeHint ? (
          <Text numberOfLines={1} style={styles.routeScopeHint}>
            {routeScopeHint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(12, 14, 20, 0.88)',
    borderColor: AppColors.border,
    borderRadius: BuildRouteLayout.mapSummaryBarRadius,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  barAttached: {
    backgroundColor: AppColors.card,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 0,
    marginHorizontal: 0,
    width: '100%',
  },
  contentColumn: {
    gap: 2,
    width: '100%',
  },
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
    width: '100%',
  },
  statsText: {
    color: AppColors.textPrimary,
    flex: 1,
    flexShrink: 1,
    fontSize: BuildRouteLayout.mapSummaryTextSize,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  routeScopeHint: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    paddingLeft: 21,
  },
  optimizeButton: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 3,
    minHeight: 32,
    minWidth: 32,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  optimizeButtonDisabled: {
    opacity: 0.55,
  },
  optimizeText: {
    color: AppColors.blue,
    fontSize: BuildRouteLayout.mapSummaryTextSize,
    fontWeight: '700',
  },
  optimizeTextDisabled: {
    color: AppColors.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
