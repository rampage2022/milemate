import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  rightAccessory?: React.ReactNode;
};

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backAccessibilityLabel = 'Go back',
  rightAccessory,
}: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            accessibilityLabel={backAccessibilityLabel}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons color={MileMateTokens.textPrimary} name="chevron-back" size={26} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.side}>{rightAccessory ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    minHeight: MileMateTokens.minTouchTarget,
  },
  side: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 44,
    width: 44,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    color: MileMateTokens.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: MileMateTokens.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
