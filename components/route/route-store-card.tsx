import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pressable as GesturePressable } from 'react-native-gesture-handler';

import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { RouteDeliveryDetailSheet } from '@/components/route/route-delivery-detail-sheet';
import { RouteDeliveryStatusChip } from '@/components/route/route-delivery-status-chip';
import { AppColors } from '@/components/shared/app-theme';
import {
  formatRouteMetaLine,
  type RouteStoreCardViewModel,
} from '@/utils/route-store-card-model';
import { getStatusColor } from '@/utils/milemate-status';

const NEXT_ACCENT = '#3B82F6';

type RouteStoreCardProps = {
  accessibilityLabel: string;
  activeStatusFooter?: ReactNode;
  delayLongPress?: number;
  isMapHighlighted?: boolean;
  omitBottomSpacing?: boolean;
  onLongPress?: () => void;
  onPress: () => void;
  pressDisabled?: boolean;
  viewModel: RouteStoreCardViewModel;
};

function StopIndicator({ viewModel }: { viewModel: RouteStoreCardViewModel }) {
  if (viewModel.variant === 'completed') {
    return (
      <View style={[styles.indicator, styles.indicatorCompleted]}>
        <Ionicons color="#FFFFFF" name="checkmark" size={18} />
      </View>
    );
  }

  if (viewModel.variant === 'skipped') {
    return (
      <View style={[styles.indicator, styles.indicatorSkipped]}>
        <Ionicons color="#FFFFFF" name="remove" size={18} />
      </View>
    );
  }

  const indicatorStyle =
    viewModel.variant === 'current'
      ? styles.indicatorCurrent
      : viewModel.variant === 'next'
        ? styles.indicatorNext
        : styles.indicatorPending;

  return (
    <View style={[styles.indicator, indicatorStyle]}>
      <Text
        style={[
          styles.indicatorNumber,
          viewModel.variant === 'pending' && styles.indicatorNumberPending,
        ]}
      >
        {viewModel.stopNumber}
      </Text>
    </View>
  );
}

function accentColor(variant: RouteStoreCardViewModel['variant']): string | null {
  if (variant === 'current') {
    return AppColors.blue;
  }

  if (variant === 'next') {
    return NEXT_ACCENT;
  }

  if (variant === 'completed') {
    return AppColors.green;
  }

  if (variant === 'skipped') {
    return getStatusColor('skipped');
  }

  return null;
}

export function RouteStoreCard({
  accessibilityLabel,
  activeStatusFooter,
  delayLongPress,
  isMapHighlighted = false,
  omitBottomSpacing = false,
  onLongPress,
  onPress,
  pressDisabled = false,
  viewModel,
}: RouteStoreCardProps) {
  const [deliverySheetOpen, setDeliverySheetOpen] = useState(false);
  const leftAccent = accentColor(viewModel.variant);
  const metaLine = formatRouteMetaLine(viewModel.distanceLabel, viewModel.arrivalLabel);

  return (
    <>
      <View
        style={[
          styles.card,
          omitBottomSpacing && styles.cardFlushBottom,
          leftAccent ? { borderLeftColor: leftAccent, borderLeftWidth: 4 } : null,
          viewModel.variant === 'current' && styles.cardCurrent,
          viewModel.variant === 'next' && styles.cardNext,
          isMapHighlighted && styles.cardMapHighlighted,
        ]}
      >
        <GesturePressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          delayLongPress={delayLongPress}
          disabled={pressDisabled}
          onLongPress={onLongPress}
          onPress={onPress}
          style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
        >
          <StopIndicator viewModel={viewModel} />

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={styles.storeName}>
                {viewModel.storeName}
              </Text>
              {viewModel.variant === 'current' ? (
                <View style={styles.currentPill}>
                  <Text style={styles.currentPillLabel}>Current</Text>
                </View>
              ) : null}
              <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
            </View>

            <Text numberOfLines={2} style={styles.address}>
              {viewModel.address}
            </Text>

            {viewModel.variant === 'completed' ? (
              <View style={styles.outcomeRow}>
                <Ionicons color={AppColors.green} name="checkmark-circle" size={16} />
                <Text style={styles.completedLabel}>
                  Completed
                  {viewModel.completedTimeLabel ? ` · ${viewModel.completedTimeLabel}` : ''}
                </Text>
              </View>
            ) : null}

            {viewModel.variant === 'skipped' ? (
              <View style={styles.outcomeRow}>
                <Ionicons
                  color={getStatusColor('skipped')}
                  name="arrow-forward-circle-outline"
                  size={16}
                />
                <Text style={styles.skippedLabel}>
                  Skipped
                  {viewModel.skippedTimeLabel ? ` · ${viewModel.skippedTimeLabel}` : ''}
                </Text>
              </View>
            ) : null}

            {metaLine ? (
              <View style={styles.metaRow}>
                <Ionicons color={AppColors.textSecondary} name="car-outline" size={15} />
                <Text style={styles.metaText}>{metaLine}</Text>
              </View>
            ) : null}

            {activeStatusFooter}
          </View>
        </GesturePressable>

        {viewModel.delivery ? (
          <View style={styles.chipRow}>
            <Pressable
              accessibilityLabel={
                viewModel.delivery.hasInteractiveDetails
                  ? `${viewModel.delivery.statusLabel}. Double tap for details.`
                  : `${viewModel.delivery.statusLabel}.`
              }
              accessibilityRole={viewModel.delivery.hasInteractiveDetails ? 'button' : 'text'}
              disabled={!viewModel.delivery.hasInteractiveDetails}
              onPress={() => {
                setDeliverySheetOpen(true);
              }}
            >
              <RouteDeliveryStatusChip
                interactive={false}
                label={viewModel.delivery.statusLabel}
                status={viewModel.delivery.status}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      {viewModel.delivery ? (
        <RouteDeliveryDetailSheet
          deliveryStatus={viewModel.delivery.status}
          details={viewModel.delivery.details}
          onClose={() => {
            setDeliverySheetOpen(false);
          }}
          storeName={viewModel.storeName}
          visible={deliverySheetOpen}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: LiveRouteLayout.stopGap,
    minHeight: 92,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardPressable: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: PlanningLayout.cardPaddingH,
    paddingTop: 16,
    paddingBottom: 10,
  },
  chipRow: {
    paddingBottom: 14,
    paddingHorizontal: PlanningLayout.cardPaddingH,
    paddingTop: 2,
  },
  cardFlushBottom: {
    marginBottom: 0,
  },
  cardCurrent: {
    backgroundColor: '#EAF5FA',
  },
  cardNext: {
    backgroundColor: '#F8FAFF',
  },
  cardMapHighlighted: {
    borderColor: AppColors.blue,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.9,
  },
  indicator: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    marginTop: 2,
    width: 36,
  },
  indicatorCurrent: {
    backgroundColor: AppColors.blue,
  },
  indicatorNext: {
    backgroundColor: NEXT_ACCENT,
  },
  indicatorPending: {
    backgroundColor: '#E5E7EB',
  },
  indicatorCompleted: {
    backgroundColor: AppColors.green,
  },
  indicatorSkipped: {
    backgroundColor: getStatusColor('skipped'),
  },
  indicatorNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  indicatorNumberPending: {
    color: AppColors.textSecondary,
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
    letterSpacing: -0.2,
  },
  currentPill: {
    backgroundColor: AppColors.blue,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentPillLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
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
  outcomeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  completedLabel: {
    color: AppColors.green,
    fontSize: 14,
    fontWeight: '700',
  },
  skippedLabel: {
    color: getStatusColor('skipped'),
    fontSize: 14,
    fontWeight: '700',
  },
});
