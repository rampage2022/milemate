import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import { getStatusBackground, getStatusColor } from '@/utils/milemate-status';
import type { RouteDeliveryChipStatus } from '@/utils/route-store-delivery-signal';

type RouteDeliveryStatusChipProps = {
  interactive: boolean;
  label: string;
  onPress?: () => void;
  status: RouteDeliveryChipStatus;
};

function toneForDeliveryStatus(status: RouteDeliveryChipStatus) {
  if (status === 'today') {
    return 'completed' as const;
  }

  if (status === 'missed') {
    return 'issue' as const;
  }

  return 'delivery' as const;
}

export function RouteDeliveryStatusChip({
  interactive,
  label,
  onPress,
  status,
}: RouteDeliveryStatusChipProps) {
  const tone = toneForDeliveryStatus(status);
  const color = getStatusColor(tone);
  const backgroundColor = getStatusBackground(tone);
  const accessibilityLabel = interactive
    ? `${label}. Double tap for details.`
    : `${label}.`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={interactive ? 'button' : 'text'}
      disabled={!interactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor },
        interactive && pressed && styles.chipPressed,
      ]}
    >
      <Ionicons accessibilityElementsHidden color={color} name="cube-outline" size={14} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipPressed: {
    opacity: 0.88,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
