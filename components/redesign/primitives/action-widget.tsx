import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import { MileMateTokens } from '@/components/redesign/tokens';

type ActionWidgetProps = {
  accessibilityLabel: string;
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
  status?: string;
  statusColor?: string;
  title: string;
};

export function ActionWidget({
  accessibilityLabel,
  detail,
  icon,
  iconColor,
  onPress,
  status,
  statusColor = MileMateTokens.textSecondary,
  title,
}: ActionWidgetProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <SurfaceCard padded style={styles.card}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${iconColor}22` }]}>
            <Ionicons color={iconColor} name={icon} size={22} />
          </View>
          <Ionicons color={MileMateTokens.textMuted} name="chevron-forward" size={18} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {status ? (
          <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        ) : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: '46%',
  },
  pressed: {
    opacity: 0.88,
  },
  card: {
    gap: 6,
    minHeight: 120,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: MileMateTokens.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
  },
  detail: {
    color: MileMateTokens.textSecondary,
    fontSize: 13,
  },
});
