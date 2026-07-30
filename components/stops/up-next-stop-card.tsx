import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteStoreCardViewModel } from '@/utils/route-store-card-model';
import { formatRouteMetaLine } from '@/utils/route-store-card-model';

import { stopCardSharedStyles } from '@/components/stops/stop-card-shared';

type UpNextStopCardProps = {
  viewModel: RouteStoreCardViewModel;
  isMapHighlighted?: boolean;
  /** Reserved for future per-stop overflow (Make Next, etc.). */
  showOverflowSlot?: boolean;
  onPress: () => void;
};

const NEXT_ACCENT = '#3B82F6';

export function UpNextStopCard({
  isMapHighlighted = false,
  onPress,
  showOverflowSlot = true,
  viewModel,
}: UpNextStopCardProps) {
  const metaLine = formatRouteMetaLine(
    viewModel.distanceLabel,
    viewModel.arrivalLabel,
  );

  return (
    <View
      style={[
        stopCardSharedStyles.card,
        stopCardSharedStyles.leftAccent,
        styles.card,
        { borderLeftColor: NEXT_ACCENT },
        isMapHighlighted && styles.highlighted,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <View style={styles.indicator}>
          <Text style={styles.indicatorNumber}>{viewModel.stopNumber}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.storeName}>
              {viewModel.storeName}
            </Text>
            {showOverflowSlot ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.overflowSlot}
              />
            ) : null}
            <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
          </View>
          <View style={styles.addressRow}>
            <Ionicons color={AppColors.textMuted} name="location-outline" size={14} />
            <Text numberOfLines={2} style={styles.address}>
              {viewModel.address}
            </Text>
          </View>
          {metaLine ? (
            <View style={styles.metaRow}>
              <Ionicons color={AppColors.textSecondary} name="car-outline" size={15} />
              <Text style={styles.metaText}>{metaLine}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: NEXT_ACCENT,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    marginTop: 2,
    width: 32,
  },
  indicatorNumber: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    gap: 6,
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
    fontSize: 18,
    fontWeight: '800',
  },
  overflowSlot: {
    height: 28,
    width: 28,
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
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metaText: {
    color: AppColors.textSecondary,
    flex: 1,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
