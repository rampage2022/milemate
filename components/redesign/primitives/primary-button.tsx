import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

type PrimaryButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  minHeight?: number;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({
  accessibilityLabel,
  disabled,
  icon,
  label,
  loading,
  minHeight,
  onPress,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        minHeight !== undefined && { minHeight },
        variant === 'secondary' && styles.secondary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons color="#FFFFFF" name={icon} size={20} /> : null}
          <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.blue,
    borderRadius: MileMateTokens.radiusButton,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  secondary: {
    backgroundColor: MileMateTokens.blueSoft,
    borderColor: 'rgba(0,122,255,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: MileMateTokens.blue,
  },
});
