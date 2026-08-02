import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { StoreOrder } from '@/types/store-order';
import {
  formatStoreOrderDeliveryDate,
  parseStoreOrderDateString,
} from '@/utils/store-order-presentation';

type OrderLogSheetProps = {
  onClose: () => void;
  orders: StoreOrder[];
  unlinkedCount: number;
  visible: boolean;
};

function formatPlacedDate(placedAt: string): string {
  const parsed = parseStoreOrderDateString(placedAt);

  if (!parsed) {
    return placedAt;
  }

  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(order: StoreOrder): string {
  if (order.status === 'delivered') {
    return 'Delivered';
  }

  if (order.status === 'missed') {
    return 'Missed';
  }

  return 'Pending';
}

export function OrderLogSheet({
  onClose,
  orders,
  unlinkedCount,
  visible,
}: OrderLogSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close order log" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Order Log</Text>
          {unlinkedCount > 0 ? (
            <Text style={styles.banner}>
              {unlinkedCount} order{unlinkedCount === 1 ? '' : 's'} could not be linked to this
              store after import. Check Order storage diagnostic in Settings (dev).
            </Text>
          ) : null}
          <ScrollView contentContainerStyle={styles.content}>
            {orders.length === 0 ? (
              <Text style={styles.empty}>No orders logged for this store yet.</Text>
            ) : (
              orders.map((order) => (
                <View key={order.id} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.status}>{statusLabel(order)}</Text>
                    <Text style={styles.placed}>Placed {formatPlacedDate(order.placedAt)}</Text>
                  </View>
                  <Text style={styles.deliveryLabel}>Expected delivery</Text>
                  <Text style={styles.deliveryDate}>
                    {formatStoreOrderDeliveryDate(order.expectedDeliveryDate)}
                  </Text>
                  {order.status === 'delivered' && order.deliveredAt ? (
                    <Text style={styles.meta}>
                      Delivered{' '}
                      {new Date(order.deliveredAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  ) : null}
                  {order.note ? <Text style={styles.note}>{order.note}</Text> : null}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    padding: 20,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    padding: 10,
  },
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  empty: {
    color: AppColors.textMuted,
    fontSize: 15,
  },
  row: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    padding: 14,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  status: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  placed: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  deliveryLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  deliveryDate: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    color: AppColors.textSecondary,
    fontSize: 13,
  },
  note: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4,
  },
});
