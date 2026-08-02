import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppColors } from '@/components/shared/app-theme';
import type { StoresMapSelectedStoreCardModel } from '@/utils/stores-map-selected-store-card-model';
import {
  STORES_MAP_FLOATING_STORE_CARD_HORIZONTAL_INSET,
  STORES_MAP_FLOATING_STORE_CARD_MAX_HEIGHT,
} from '@/utils/stores-map-sheet-layout';

type StoresMapFloatingStoreCardProps = {
  bottomOffset: number;
  model: StoresMapSelectedStoreCardModel;
  onAddToRoute: () => void;
  onClose: () => void;
  onNavigate: () => void;
  onOpenStoreDetails: () => void;
  onPressGroupBadge: () => void;
};

function metricToneColor(tone: StoresMapSelectedStoreCardModel['alertTone']): string {
  if (tone === 'critical') {
    return '#F87171';
  }

  if (tone === 'warning') {
    return '#FBBF24';
  }

  return '#34D399';
}

type MetricProps = {
  accentValue?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  toneColor?: string;
  value: string;
  wide?: boolean;
};

function MetricCell({ accentValue, icon, label, toneColor, value, wide }: MetricProps) {
  return (
    <View style={[styles.metricCell, wide && styles.metricCellWide]}>
      <View style={styles.metricLabelRow}>
        <Ionicons color={AppColors.textMuted} name={icon} size={12} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text
        allowFontScaling
        numberOfLines={2}
        style={[
          styles.metricValue,
          accentValue && styles.metricValueAccent,
          toneColor ? { color: toneColor } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function StoresMapFloatingStoreCard({
  bottomOffset,
  model,
  onAddToRoute,
  onClose,
  onNavigate,
  onOpenStoreDetails,
  onPressGroupBadge,
}: StoresMapFloatingStoreCardProps) {
  const titleLine = model.storeNumberLabel
    ? `${model.storeName} ${model.storeNumberLabel}`
    : model.storeName;

  const visibility = model.metricVisibility;
  const metricCells: ReactNode[] = [];

  if (visibility.alert) {
    metricCells.push(
      <MetricCell
        key="alert"
        icon="shield-checkmark-outline"
        label="Alert"
        toneColor={metricToneColor(model.alertTone)}
        value={model.alertLabel}
      />,
    );
  }

  if (visibility.lastDelivery) {
    metricCells.push(
      <MetricCell key="last-delivery" icon="bus-outline" label="Last delivery" value={model.lastDeliveryLabel} />,
    );
  }

  if (model.showCompactVisitFocus) {
    if (visibility.lastVisit) {
      metricCells.push(
        <MetricCell
          key="last-visit"
          accentValue
          icon="time-outline"
          label="Last visit"
          value={model.lastVisitLabel}
        />,
      );
    }
  } else {
    if (visibility.upcomingDelivery) {
      metricCells.push(
        <MetricCell
          key="upcoming"
          accentValue
          icon="calendar-outline"
          label="Upcoming delivery"
          value={model.upcomingDeliveryLabel}
        />,
      );
    }

    if (visibility.workdayGroup) {
      metricCells.push(
        <MetricCell
          key="workday"
          accentValue
          icon="people-outline"
          label="Workday / Group"
          value={model.workdayGroupLabel}
          wide
        />,
      );
    }

    if (visibility.note) {
      metricCells.push(
        <MetricCell key="note" icon="document-text-outline" label="Note" value={model.notePreview} wide />,
      );
    }
  }

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: bottomOffset }]}>
      <View
        accessibilityLabel={`${model.storeName}, ${model.address}, ${model.workdayGroupLabel}${
          model.alertTone !== 'none' ? `, ${model.alertLabel}` : ''
        }`}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons color={AppColors.blue} name="storefront" size={22} />
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.titleBadgeRow}>
              <Pressable
                accessibilityHint="Opens store details"
                accessibilityRole="button"
                onPress={onOpenStoreDetails}
                style={({ pressed }) => [styles.titlePressable, pressed && styles.pressed]}
              >
                <Text allowFontScaling numberOfLines={2} style={styles.title}>
                  {titleLine}
                </Text>
              </Pressable>
              <Pressable
                accessibilityHint="Choose a store group"
                accessibilityRole="button"
                hitSlop={6}
                onPress={onPressGroupBadge}
                style={({ pressed }) => [
                  styles.badge,
                  model.assignmentBadge === 'Unassigned' && styles.badgeMuted,
                  pressed && styles.pressed,
                ]}
              >
                <Text allowFontScaling numberOfLines={1} style={styles.badgeText}>
                  {model.assignmentBadge}
                </Text>
                <Ionicons color={AppColors.blue} name="chevron-down" size={12} />
              </Pressable>
            </View>
            <Text allowFontScaling numberOfLines={2} style={styles.address}>
              {model.address}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close store preview"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons color={AppColors.textSecondary} name="close" size={22} />
          </Pressable>
        </View>

        {metricCells.length > 0 ? <View style={styles.metricsGrid}>{metricCells}</View> : null}

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityLabel={model.navigateAccessibilityLabel}
            accessibilityRole="button"
            onPress={onNavigate}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Ionicons color="#FFFFFF" name="navigate-outline" size={18} />
            <Text style={styles.primaryButtonText}>Navigate</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={model.addToRouteAccessibilityLabel}
            accessibilityRole="button"
            disabled={model.isOnTodayRoute}
            onPress={onAddToRoute}
            style={({ pressed }) => [
              styles.secondaryButton,
              model.isOnTodayRoute && styles.secondaryButtonDisabled,
              pressed && !model.isOnTodayRoute && styles.pressed,
            ]}
          >
            <Ionicons
              color={model.isOnTodayRoute ? AppColors.textMuted : AppColors.blue}
              name="add"
              size={20}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                model.isOnTodayRoute && styles.secondaryButtonTextDisabled,
              ]}
            >
              {model.isOnTodayRoute ? 'On route' : 'Add'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    left: STORES_MAP_FLOATING_STORE_CARD_HORIZONTAL_INSET,
    position: 'absolute',
    right: STORES_MAP_FLOATING_STORE_CARD_HORIZONTAL_INSET,
    zIndex: 5,
  },
  card: {
    backgroundColor: 'rgba(11, 14, 20, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    maxHeight: STORES_MAP_FLOATING_STORE_CARD_MAX_HEIGHT,
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  titleBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  titlePressable: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    color: AppColors.textPrimary,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 21,
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.45)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  badgeText: {
    color: AppColors.blue,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 120,
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 28,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCell: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '31.5%',
  },
  metricCellWide: {
    width: '48%',
  },
  metricLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  metricLabel: {
    color: AppColors.textMuted,
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    color: AppColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  metricValueAccent: {
    color: AppColors.blue,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
  },
  secondaryButtonText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonTextDisabled: {
    color: AppColors.textMuted,
  },
  pressed: {
    opacity: 0.88,
  },
});
