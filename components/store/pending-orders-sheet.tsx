import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import type { StoreOrder } from '@/types/store-order';
import { formatStoreOrderDeliveryDate } from '@/utils/store-order-presentation';

type PendingOrdersSheetProps = {
  isSaving: boolean;
  onClose: () => void;
  onDeliveryStatusPress: (orderId: string) => void;
  orders: StoreOrder[];
  visible: boolean;
};

export function PendingOrdersSheet({
  isSaving,
  onClose,
  onDeliveryStatusPress,
  orders,
  visible,
}: PendingOrdersSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close pending orders" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Pending Orders</Text>
          <ScrollView contentContainerStyle={styles.content}>
            {orders.map((order) => (
              <View key={order.id} style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.deliveryLabel}>Expected Delivery</Text>
                  <Text style={styles.deliveryDate}>
                    {formatStoreOrderDeliveryDate(order.expectedDeliveryDate)}
                  </Text>
                  {order.note ? <Text style={styles.note}>{order.note}</Text> : null}
                </View>
                <Pressable
                  accessibilityLabel="Update delivery status"
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={() => {
                    onDeliveryStatusPress(order.id);
                  }}
                  style={({ pressed }) => [
                    styles.statusButton,
                    isSaving && styles.statusButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.statusButtonText}>Delivery Status</Text>
                </Pressable>
              </View>
            ))}
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
    maxHeight: '70%',
    padding: 20,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  row: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 14,
  },
  rowCopy: {
    gap: 4,
  },
  deliveryLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  deliveryDate: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  note: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
  statusButton: {
    alignItems: 'center',
    backgroundColor: AppColors.green,
    borderRadius: AppSpacing.buttonRadius,
    justifyContent: 'center',
    minHeight: 44,
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
