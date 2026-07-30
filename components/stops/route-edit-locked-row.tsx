import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { StoreVisit } from '@/types/store-visit';

type RouteEditLockedRowProps = {
  onPress?: () => void;
  status: StoreVisit['status'];
  statusLabel: string;
  stopNumber: number;
  storeName: string;
};

function statusColor(status: StoreVisit['status']): string {
  if (status === 'completed') {
    return AppColors.green;
  }

  if (status === 'skipped') {
    return '#EA580C';
  }

  if (status === 'checked_in') {
    return AppColors.green;
  }

  return AppColors.blue;
}

export function RouteEditLockedRow({
  onPress,
  status,
  statusLabel,
  stopNumber,
  storeName,
}: RouteEditLockedRowProps) {
  const accent = statusColor(status);

  return (
    <Pressable
      accessibilityLabel={`Stop ${stopNumber}, ${storeName}, ${statusLabel}, locked`}
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderLeftColor: accent },
        pressed && onPress && styles.rowPressed,
      ]}
    >
      <View style={[styles.orderBadge, { backgroundColor: accent }]}>
        {status === 'completed' ? (
          <Ionicons color="#FFFFFF" name="checkmark" size={16} />
        ) : (
          <Text style={styles.orderTextOnAccent}>{stopNumber}</Text>
        )}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.storeName}>
          {storeName}
        </Text>
        <Text style={[styles.status, { color: accent }]}>{statusLabel}</Text>
      </View>
      <Ionicons color={AppColors.textMuted} name="lock-closed" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderLeftWidth: 3,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    marginBottom: LiveRouteLayout.stopGap,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.92,
  },
  orderBadge: {
    alignItems: 'center',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    minWidth: 30,
    paddingHorizontal: 4,
  },
  orderTextOnAccent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
