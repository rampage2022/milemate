import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable as GesturePressable } from 'react-native-gesture-handler';

import { ActiveWorkdayReorderLayout } from '@/components/coordinator/active-workday-reorder-layout';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import type { StoreVisit } from '@/types/store-visit';
import { isVisitCheckedInForActiveWorkdayReorder } from '@/utils/active-workday-route-origin';

type ActiveWorkdayReorderStopRowProps = {
  addressLine: string;
  delayLongPress?: number;
  isActive?: boolean;
  isCurrentStop?: boolean;
  isNextInRoute?: boolean;
  isSkipped?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
  stopNumber: number;
  storeName: string;
};

export function ActiveWorkdayReorderStopRow({
  addressLine,
  delayLongPress = 250,
  isActive = false,
  isCurrentStop = false,
  isNextInRoute = false,
  isSkipped = false,
  onLongPress,
  onPress,
  stopNumber,
  storeName,
}: ActiveWorkdayReorderStopRowProps) {
  const highlightNext = isNextInRoute && !isSkipped;

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
        highlightNext && styles.rowNext,
        isActive && styles.rowActive,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.timelineColumn}>
        <View style={[styles.timelineDot, highlightNext && styles.timelineDotNext]}>
          <Text style={[styles.timelineIndex, highlightNext && styles.timelineIndexNext]}>
            {stopNumber}
          </Text>
        </View>
      </View>
      <View style={styles.copy}>
        {isCurrentStop ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>CURRENT</Text>
          </View>
        ) : null}
        {!isCurrentStop && highlightNext ? (
          <View style={styles.nextPill}>
            <Text style={styles.nextPillText}>NEXT</Text>
          </View>
        ) : null}
        {!isCurrentStop && isSkipped ? (
          <View style={styles.skippedPill}>
            <Text style={styles.skippedPillText}>SKIPPED</Text>
          </View>
        ) : null}
        <Text numberOfLines={1} style={styles.storeName}>
          {storeName}
        </Text>
        {addressLine.length > 0 ? (
          <View style={styles.addressBlock}>
            <Text numberOfLines={2} style={styles.addressLine}>
              {addressLine}
            </Text>
          </View>
        ) : (
          <View style={styles.addressBlock} />
        )}
      </View>
      {onLongPress ? (
        <View style={styles.dragHandle}>
          <Ionicons
            accessibilityElementsHidden
            color={AppColors.textMuted}
            importantForAccessibility="no-hide-descendants"
            name="reorder-three-outline"
            size={18}
          />
        </View>
      ) : null}
    </GesturePressable>
  );
}

export function isVisitCurrentForReorder(
  visit: StoreVisit,
  _currentVisitId: string | null,
): boolean {
  return isVisitCheckedInForActiveWorkdayReorder(visit);
}

export { isVisitCheckedInForActiveWorkdayReorder };

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: ActiveWorkdayReorderLayout.stopRowMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  rowNext: {
    borderColor: AppColors.blue,
    borderWidth: 1.5,
  },
  rowActive: {
    opacity: 0.96,
  },
  rowPressed: {
    opacity: 0.9,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 30,
  },
  timelineDot: {
    alignItems: 'center',
    borderColor: AppColors.textMuted,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  timelineDotNext: {
    backgroundColor: AppColors.blue,
    borderColor: AppColors.blue,
  },
  timelineIndex: {
    color: AppColors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  timelineIndexNext: {
    color: '#FFFFFF',
  },
  copy: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusPillText: {
    color: AppColors.orange,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  nextPill: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nextPillText: {
    color: AppColors.blue,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skippedPill: {
    alignSelf: 'flex-start',
    backgroundColor: MileMateTokens.backgroundElevated,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  skippedPillText: {
    color: AppColors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: ActiveWorkdayReorderLayout.storeNameSize,
    fontWeight: '800',
  },
  addressBlock: {
    justifyContent: 'center',
    minHeight: 36,
  },
  addressLine: {
    color: AppColors.textSecondary,
    fontSize: ActiveWorkdayReorderLayout.storeAddressSize,
    lineHeight: 18,
  },
  dragHandle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 24,
  },
});
