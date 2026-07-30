import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { HomeColors } from '@/components/home/theme';

type WorkdayStatColumnProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit: string;
};

export function WorkdayStatColumn({
  icon,
  label,
  value,
  unit,
}: WorkdayStatColumnProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={16} color={HomeColors.textSecondary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  label: {
    color: HomeColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    color: HomeColors.textPrimary,
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 44,
  },
  unit: {
    color: HomeColors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
