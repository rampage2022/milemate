import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

export type AlertPriority = 'informational' | 'high';

type AlertTriangleProps = {
  accessibilityLabel: string;
  onPress: () => void;
  priority?: AlertPriority;
};

export function AlertTriangle({
  accessibilityLabel,
  onPress,
  priority = 'informational',
}: AlertTriangleProps) {
  const color = priority === 'high' ? MileMateTokens.red : MileMateTokens.orange;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <Ionicons color={color} name="warning" size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    height: MileMateTokens.minTouchTarget,
    justifyContent: 'center',
    width: MileMateTokens.minTouchTarget,
  },
  pressed: {
    opacity: 0.75,
  },
});
