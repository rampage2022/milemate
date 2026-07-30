import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActiveWorkdayReorderLayout } from '@/components/coordinator/active-workday-reorder-layout';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteStoreCardViewModel } from '@/utils/route-store-card-model';

import { stopCardSharedStyles } from '@/components/stops/stop-card-shared';

type CompletedStopCardProps = {
  compact?: boolean;
  viewModel: RouteStoreCardViewModel;
  isMapHighlighted?: boolean;
  onPress: () => void;
};

export function CompletedStopCard({
  compact = false,
  isMapHighlighted = false,
  onPress,
  viewModel,
}: CompletedStopCardProps) {
  return (
    <View
      style={[
        stopCardSharedStyles.card,
        stopCardSharedStyles.leftAccent,
        styles.card,
        compact && styles.cardCompact,
        { borderLeftColor: AppColors.green },
        isMapHighlighted && styles.highlighted,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          compact && styles.pressableCompact,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.indicator, compact && styles.indicatorCompact]}>
          <Ionicons color="#FFFFFF" name="checkmark" size={compact ? 14 : 18} />
        </View>
        <View style={[styles.body, compact && styles.bodyCompact]}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.storeName, compact && styles.storeNameCompact]}>
              {viewModel.storeName}
            </Text>
            <Ionicons color={AppColors.textMuted} name="chevron-forward" size={compact ? 16 : 18} />
          </View>
          <View style={styles.addressRow}>
            <Ionicons color={AppColors.textMuted} name="location-outline" size={compact ? 12 : 14} />
            <Text numberOfLines={2} style={[styles.address, compact && styles.addressCompact]}>
              {viewModel.address}
            </Text>
          </View>
          <Text style={[styles.completedMeta, compact && styles.completedMetaCompact]}>
            Completed
            {viewModel.completedTimeLabel
              ? ` ${viewModel.completedTimeLabel}`
              : ''}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
  },
  cardCompact: {
    marginBottom: 0,
    minHeight: ActiveWorkdayReorderLayout.completedRowMinHeight,
  },
  highlighted: {
    borderColor: AppColors.blue,
    borderWidth: 2,
  },
  pressable: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: PlanningLayout.cardPaddingH,
    paddingVertical: 14,
  },
  pressableCompact: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.92,
  },
  indicator: {
    alignItems: 'center',
    backgroundColor: AppColors.green,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    marginTop: 2,
    width: 32,
  },
  indicatorCompact: {
    height: 26,
    marginTop: 0,
    width: 26,
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  bodyCompact: {
    gap: 2,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  storeName: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  storeNameCompact: {
    fontSize: ActiveWorkdayReorderLayout.storeNameSize,
  },
  addressRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 4,
  },
  address: {
    color: AppColors.textSecondary,
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  addressCompact: {
    fontSize: ActiveWorkdayReorderLayout.storeAddressSize,
    lineHeight: 18,
  },
  completedMeta: {
    color: AppColors.green,
    fontSize: 14,
    fontWeight: '700',
  },
  completedMetaCompact: {
    fontSize: 12,
    fontWeight: '700',
  },
});
