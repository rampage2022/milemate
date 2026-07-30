import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';

type BriefingStatProps = {
  accessibilityLabel: string;
  label: string;
  value: number;
};

export function BriefingStat({
  accessibilityLabel,
  label,
  value,
}: BriefingStatProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      style={styles.container}
    >
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  value: {
    color: AppColors.textPrimary,
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 40,
  },
  label: {
    color: AppColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
