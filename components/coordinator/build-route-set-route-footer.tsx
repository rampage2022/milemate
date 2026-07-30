import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { AppColors } from '@/components/shared/app-theme';

type BuildRouteSetRouteFooterProps = {
  blockerMessage?: string | null;
  disabled: boolean;
  isCalculating: boolean;
  onPress: () => void;
};

export function BuildRouteSetRouteFooter({
  blockerMessage = 'Add at least one stop to continue.',
  disabled,
  isCalculating,
  onPress,
}: BuildRouteSetRouteFooterProps) {
  const isDisabled = disabled || isCalculating;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={isCalculating ? 'Calculating route' : 'Set Route'}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: isCalculating }}
        disabled={isDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          isDisabled ? styles.buttonDisabled : styles.buttonPrimary,
          pressed && !isDisabled && styles.pressed,
        ]}
      >
        {isCalculating ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.buttonTextPrimary}>Calculating Route…</Text>
          </View>
        ) : (
          <Text style={[styles.buttonText, isDisabled ? styles.buttonTextDisabled : styles.buttonTextPrimary]}>
            Set Route
          </Text>
        )}
      </Pressable>
      {!isDisabled && !isCalculating ? (
        <Text style={styles.nextStep}>Next: Review & Start</Text>
      ) : isDisabled && !isCalculating && blockerMessage ? (
        <Text style={styles.helper}>{blockerMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: BuildRouteLayout.setRouteMinHeight,
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: AppColors.blue,
  },
  buttonDisabled: {
    backgroundColor: AppColors.backgroundElevated,
    borderColor: AppColors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: AppColors.textMuted,
  },
  nextStep: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  helper: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pressed: {
    opacity: 0.92,
  },
});
