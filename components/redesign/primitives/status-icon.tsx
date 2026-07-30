import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

export type StatusIconKind = 'delivery' | 'hours' | 'notes' | 'alert';

const KIND_CONFIG: Record<
  StatusIconKind,
  { icon: keyof typeof Ionicons.glyphMap; defaultColor: string }
> = {
  delivery: { icon: 'cube-outline', defaultColor: MileMateTokens.orange },
  hours: { icon: 'time-outline', defaultColor: MileMateTokens.purple },
  notes: { icon: 'document-text-outline', defaultColor: MileMateTokens.textSecondary },
  alert: { icon: 'alert-circle-outline', defaultColor: MileMateTokens.orange },
};

type StatusIconProps = {
  accessibilityLabel: string;
  color?: string;
  kind: StatusIconKind;
  onPress?: () => void;
};

export function StatusIcon({
  accessibilityLabel,
  color,
  kind,
  onPress,
}: StatusIconProps) {
  const config = KIND_CONFIG[kind];
  const tint = color ?? config.defaultColor;

  const icon = (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : 'image'}
      style={[styles.circle, { backgroundColor: `${tint}22` }]}
    >
      <Ionicons color={tint} name={config.icon} size={16} />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={6}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {icon}
      </Pressable>
    );
  }

  return icon;
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    borderRadius: 14,
    height: MileMateTokens.minTouchTarget / 2,
    justifyContent: 'center',
    width: MileMateTokens.minTouchTarget / 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
