import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';

type RoutePlanningSetRouteButtonProps = {
  blockerMessage?: string | null;
  disabled: boolean;
  isCalculating: boolean;
  onPress: () => void;
  visible: boolean;
};

/** Inline Set Route action (replaces floating dock primary CTA while dock UI is hidden). */
export function RoutePlanningSetRouteButton({
  blockerMessage = null,
  disabled,
  isCalculating,
  onPress,
  visible,
}: RoutePlanningSetRouteButtonProps) {
  if (!visible) {
    return null;
  }

  const isDisabled = disabled || isCalculating;

  return (
    <View style={styles.container}>
      {blockerMessage && isDisabled && !isCalculating ? (
        <Text style={styles.blockerText}>{blockerMessage}</Text>
      ) : null}

      <Pressable
        accessibilityLabel={isCalculating ? 'Calculating route' : 'Set Route'}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: isCalculating }}
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.primaryButton,
          isDisabled && styles.primaryButtonDisabled,
          pressed && !isDisabled && styles.primaryButtonPressed,
        ]}
      >
        {isCalculating ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.primaryButtonText}>Calculating Route…</Text>
          </View>
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Set Route</Text>
            <Text style={styles.primaryButtonSubtext}>Optimize & continue</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
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
    borderRadius: PlanningLayout.cardRadius,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
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
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
});
