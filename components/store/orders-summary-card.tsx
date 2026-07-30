import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StoreOverviewCard } from '@/components/store/store-overview-card';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import {
  buildPendingOrderCardPresentation,
  buildPendingOrderExpectedLine,
} from '@/utils/store-order-delivery-presentation';
import { formatStoreOrderDeliveryDate } from '@/utils/store-order-presentation';

type OrdersSummaryCardProps = {
  isSaving: boolean;
  latestNotReceivedChecksByOrderId: Record<string, StoreOrderDeliveryCheck | null>;
  onDeliveryStatusPress: (orderId: string) => void;
  onPlaceOrder: () => void;
  onViewOrderLog: () => void;
  onViewPendingOrders: () => void;
  orderLogCount: number;
  pendingOrders: StoreOrder[];
};

function nextDeliveryDate(orders: StoreOrder[]): string | null {
  if (orders.length === 0) {
    return null;
  }

  return formatStoreOrderDeliveryDate(orders[0]!.expectedDeliveryDate);
}

function PendingOrderDetails({
  latestNotReceivedCheck,
  order,
}: {
  latestNotReceivedCheck: StoreOrderDeliveryCheck | null;
  order: StoreOrder;
}) {
  const presentation = buildPendingOrderCardPresentation({
    latestNotReceivedCheck,
    order,
  });

  return (
    <>
      <Text style={styles.statusText}>{presentation.headline}</Text>
      {presentation.expectedLine ? (
        <Text style={styles.expectedLine}>{presentation.expectedLine}</Text>
      ) : presentation.headline === 'Pending Order' ? (
        <View style={styles.deliveryBlock}>
          <Text style={styles.deliveryLabel}>Expected Delivery</Text>
          <Text style={styles.deliveryDate}>
            {formatStoreOrderDeliveryDate(order.expectedDeliveryDate)}
          </Text>
        </View>
      ) : null}
      {presentation.secondaryLabel ? (
        <Text style={styles.secondaryLabel}>{presentation.secondaryLabel}</Text>
      ) : null}
      {presentation.checkedLabel ? (
        <Text style={styles.checkedLabel}>{presentation.checkedLabel}</Text>
      ) : null}
    </>
  );
}

export function OrdersSummaryCard({
  isSaving,
  latestNotReceivedChecksByOrderId,
  onDeliveryStatusPress,
  onPlaceOrder,
  onViewOrderLog,
  onViewPendingOrders,
  orderLogCount,
  pendingOrders,
}: OrdersSummaryCardProps) {
  const orderLogAction =
    orderLogCount > 0 ? (
      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={onViewOrderLog}
        style={({ pressed }) => [
          styles.secondaryAction,
          isSaving && styles.actionDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryActionText}>
          View order log ({orderLogCount})
        </Text>
      </Pressable>
    ) : null;

  if (pendingOrders.length === 0) {
    return (
      <StoreOverviewCard title="Orders">
        <Text style={styles.emptyText}>No pending orders</Text>
        {orderLogAction}
        <Pressable
          disabled={isSaving}
          onPress={onPlaceOrder}
          style={({ pressed }) => [
            styles.secondaryAction,
            isSaving && styles.actionDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryActionText}>Log Order</Text>
        </Pressable>
      </StoreOverviewCard>
    );
  }

  if (pendingOrders.length === 1) {
    const order = pendingOrders[0]!;

    return (
      <StoreOverviewCard title="Orders">
        <PendingOrderDetails
          latestNotReceivedCheck={latestNotReceivedChecksByOrderId[order.id] ?? null}
          order={order}
        />
        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Update delivery status"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => {
              onDeliveryStatusPress(order.id);
            }}
            style={({ pressed }) => [
              styles.primaryAction,
              isSaving && styles.actionDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryActionText}>Delivery Status</Text>
          </Pressable>
        </View>
        {orderLogAction}
      </StoreOverviewCard>
    );
  }

  const nextOrder = pendingOrders[0]!;
  const nextDelivery = nextDeliveryDate(pendingOrders);

  return (
    <StoreOverviewCard title="Orders">
      <Text style={styles.statusText}>{pendingOrders.length} Pending Orders</Text>
      {nextDelivery ? (
        <View style={styles.deliveryBlock}>
          <Text style={styles.deliveryLabel}>Next Delivery</Text>
          <Text style={styles.deliveryDate}>{nextDelivery}</Text>
          <Text style={styles.nextOrderHint}>{buildPendingOrderExpectedLine(nextOrder)}</Text>
        </View>
      ) : null}
      <Pressable
        disabled={isSaving}
        onPress={onViewPendingOrders}
        style={({ pressed }) => [
          styles.secondaryAction,
          isSaving && styles.actionDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryActionText}>View Pending Orders</Text>
      </Pressable>
      {orderLogAction}
    </StoreOverviewCard>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  statusText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  expectedLine: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  deliveryBlock: {
    gap: 4,
  },
  deliveryLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  deliveryDate: {
    color: AppColors.textPrimary,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 26,
  },
  nextOrderHint: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryLabel: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  checkedLabel: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  actionRow: {
    gap: 8,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: AppColors.green,
    borderRadius: AppSpacing.buttonRadius,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: AppSpacing.buttonRadius,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryActionText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
});
