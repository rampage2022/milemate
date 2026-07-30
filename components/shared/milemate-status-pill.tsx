import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { getStatusBackground, getStatusColor, getStatusIcon } from '@/utils/milemate-status';
import type { MileMateStatusTone } from '@/utils/milemate-status';

type MileMateStatusPillProps = {
  label: string;
  tone: MileMateStatusTone;
};

export function MileMateStatusPill({ label, tone }: MileMateStatusPillProps) {
  const color = getStatusColor(tone);
  const backgroundColor = getStatusBackground(tone);
  const icon = getStatusIcon(tone);

  return (
    <View
      accessibilityLabel={`${label}, ${tone}`}
      accessibilityRole="text"
      style={[styles.pill, { backgroundColor }]}
    >
      <Ionicons accessibilityElementsHidden color={color} name={icon} size={14} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
