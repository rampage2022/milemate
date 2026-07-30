import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteStoreCardViewModel } from '@/utils/route-store-card-model';

import { stopCardSharedStyles } from '@/components/stops/stop-card-shared';

type CompletedStopCardProps = {
  viewModel: RouteStoreCardViewModel;
  isMapHighlighted?: boolean;
  onPress: () => void;
};

export function CompletedStopCard({
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
        { borderLeftColor: AppColors.green },
        isMapHighlighted && styles.highlighted,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <View style={styles.indicator}>
          <Ionicons color="#FFFFFF" name="checkmark" size={18} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.storeName}>
              {viewModel.storeName}
            </Text>
            <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
          </View>
          <View style={styles.addressRow}>
            <Ionicons color={AppColors.textMuted} name="location-outline" size={14} />
            <Text numberOfLines={2} style={styles.address}>
              {viewModel.address}
            </Text>
          </View>
          <Text style={styles.completedMeta}>
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
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
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
  completedMeta: {
    color: AppColors.green,
    fontSize: 14,
    fontWeight: '700',
  },
});
