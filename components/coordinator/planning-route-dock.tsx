import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';

type PlanningRouteDockProps = {
  blockerMessage?: string | null;
  bottomInset?: number;
  distanceLabel: string;
  onLayout: (height: number) => void;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLabel: string;
  stopsLabel: string;
  timeLabel: string;
  visible: boolean;
};

type DockMetricProps = {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  showDivider: boolean;
  value: string;
};

function DockMetric({
  accessibilityLabel,
  icon,
  iconColor,
  label,
  showDivider,
  value,
}: DockMetricProps) {
  return (
    <>
      {showDivider ? <View style={styles.metricDivider} /> : null}
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="text"
        style={styles.metricCell}
      >
        <Ionicons color={iconColor} name={icon} size={16} />
        <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={styles.metricValue}>
          {value}
        </Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={styles.metricLabel}>
          {label}
        </Text>
      </View>
    </>
  );
}

export function PlanningRouteDock({
  blockerMessage = null,
  bottomInset = 0,
  distanceLabel,
  onLayout,
  onPrimaryPress,
  primaryDisabled = false,
  primaryLabel,
  stopsLabel,
  timeLabel,
  visible,
}: PlanningRouteDockProps) {
  if (!visible) {
    return null;
  }

  function handleLayout(event: LayoutChangeEvent) {
    onLayout(event.nativeEvent.layout.height);
  }

  return (
    <View
      onLayout={handleLayout}
      pointerEvents="box-none"
      style={[styles.container, { bottom: bottomInset }]}
    >
      <View style={styles.panel}>
        <View style={styles.metricsRow}>
          <DockMetric
            accessibilityLabel={`Estimated distance ${distanceLabel}`}
            icon="location-outline"
            iconColor="#2563EB"
            label="Est. miles"
            showDivider={false}
            value={distanceLabel}
          />
          <DockMetric
            accessibilityLabel={`Estimated time ${timeLabel}`}
            icon="time-outline"
            iconColor="#16A34A"
            label="Est. time"
            showDivider
            value={timeLabel}
          />
          <DockMetric
            accessibilityLabel={`Stops ${stopsLabel}`}
            icon="checkmark-circle-outline"
            iconColor="#7C3AED"
            label="Stops"
            showDivider
            value={stopsLabel}
          />
        </View>

        {blockerMessage ? <Text style={styles.blockerText}>{blockerMessage}</Text> : null}

        <Pressable
          accessibilityLabel={primaryLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled: primaryDisabled }}
          disabled={primaryDisabled}
          onPress={onPrimaryPress}
          style={({ pressed }) => [
            styles.primaryButton,
            primaryDisabled && styles.primaryButtonDisabled,
            pressed && !primaryDisabled && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          <Text style={styles.primaryButtonSubtext}>Optimize & continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  panel: {
    backgroundColor: AppColors.card,
    borderTopColor: 'rgba(17, 24, 39, 0.12)',
    borderTopLeftRadius: PlanningLayout.summaryCardRadius,
    borderTopRightRadius: PlanningLayout.summaryCardRadius,
    borderTopWidth: 1,
    elevation: 3,
    gap: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  metricsRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  metricCell: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  metricDivider: {
    alignSelf: 'stretch',
    backgroundColor: AppColors.border,
    marginVertical: 4,
    width: StyleSheet.hairlineWidth,
  },
  metricValue: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'center',
  },
  metricLabel: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  blockerText: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonSubtext: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
