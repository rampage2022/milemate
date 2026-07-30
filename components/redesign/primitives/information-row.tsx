import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

type InformationRowProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  value?: string;
  valueColor?: string;
};

export function InformationRow({
  icon,
  iconColor = MileMateTokens.textSecondary,
  label,
  onPress,
  trailing,
  value,
  valueColor = MileMateTokens.textPrimary,
}: InformationRowProps) {
  const content = (
    <>
      {icon ? (
        <Ionicons color={iconColor} name={icon} size={18} style={styles.leadingIcon} />
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {value ? (
          <Text style={[styles.value, { color: valueColor }]} numberOfLines={2}>
            {value}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? (
        <Ionicons color={MileMateTokens.textMuted} name="chevron-forward" size={18} />
      ) : null)}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: MileMateTokens.minTouchTarget,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.75,
  },
  leadingIcon: {
    width: 22,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: MileMateTokens.textSecondary,
    fontSize: 13,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
});
