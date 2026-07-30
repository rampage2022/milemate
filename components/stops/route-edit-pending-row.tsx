import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable as GesturePressable } from 'react-native-gesture-handler';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';

type RouteEditPendingRowProps = {
  addressLine: string;
  delayLongPress?: number;
  isActive?: boolean;
  isNextInRoute?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
  stopNumber: number;
  storeName: string;
};

export function RouteEditPendingRow({
  addressLine,
  delayLongPress = 400,
  isActive = false,
  isNextInRoute = false,
  onLongPress,
  onPress,
  stopNumber,
  storeName,
}: RouteEditPendingRowProps) {
  return (
    <GesturePressable
      accessibilityHint={
        onLongPress ? 'Press and hold, then drag to reorder' : undefined
      }
      accessibilityLabel={`Stop ${stopNumber}, ${storeName}, ${addressLine}`}
      accessibilityRole="button"
      delayLongPress={delayLongPress}
      disabled={isActive}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isActive && styles.rowActive,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.orderBadge}>
        <Text style={styles.orderText}>{stopNumber}</Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.storeName}>
            {storeName}
          </Text>
          {isNextInRoute ? (
            <View style={styles.nextPill}>
              <Text style={styles.nextPillText}>Next</Text>
            </View>
          ) : null}
        </View>
        {addressLine.length > 0 ? (
          <Text numberOfLines={1} style={styles.addressLine}>
            {addressLine}
          </Text>
        ) : null}
      </View>
      <Ionicons
        accessibilityElementsHidden
        color={AppColors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name="reorder-three"
        size={22}
      />
    </GesturePressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    width: '100%',
  },
  rowActive: {
    opacity: 0.98,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  rowPressed: {
    opacity: 0.92,
  },
  orderBadge: {
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    minWidth: 32,
    paddingHorizontal: 6,
  },
  orderText: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
  },
  storeName: {
    color: AppColors.textPrimary,
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 0,
  },
  nextPill: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  nextPillText: {
    color: AppColors.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  addressLine: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
