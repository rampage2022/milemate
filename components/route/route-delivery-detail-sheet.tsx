import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteDeliveryStatusChip } from '@/components/route/route-delivery-status-chip';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteDeliveryDetailFields } from '@/utils/route-store-delivery-signal';
import type { RouteDeliveryChipStatus } from '@/utils/route-store-delivery-signal';

type RouteDeliveryDetailSheetProps = {
  deliveryStatus: RouteDeliveryChipStatus;
  details: RouteDeliveryDetailFields;
  onClose: () => void;
  storeName: string;
  visible: boolean;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function RouteDeliveryDetailSheet({
  deliveryStatus,
  details,
  onClose,
  storeName,
  visible,
}: RouteDeliveryDetailSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  const rows = [
    details.scheduledDate ? { label: 'Scheduled Date', value: details.scheduledDate } : null,
    details.deliveryDate ? { label: 'Delivery Date', value: details.deliveryDate } : null,
    details.missedDate ? { label: 'Missed Date', value: details.missedDate } : null,
    details.reason ? { label: 'Reason', value: details.reason } : null,
    details.notes ? { label: 'Notes', value: details.notes } : null,
    details.updatedAt ? { label: 'Last Updated', value: details.updatedAt } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Dismiss delivery details" onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Delivery</Text>
              <Text numberOfLines={1} style={styles.storeName}>
                {storeName}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close delivery details" onPress={onClose} style={styles.closeButton}>
              <Ionicons color={AppColors.textSecondary} name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.statusBlock}>
              <Text style={styles.statusHeading}>Status</Text>
              <RouteDeliveryStatusChip
                interactive={false}
                label={details.statusLabel}
                status={deliveryStatus}
              />
            </View>

            {rows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.closeCta, pressed && styles.closeCtaPressed]}
          >
            <Text style={styles.closeCtaLabel}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AppColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '72%',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  storeName: {
    color: AppColors.textSecondary,
    fontSize: 15,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  content: {
    gap: 12,
    paddingBottom: 12,
    paddingTop: 16,
  },
  statusBlock: {
    gap: 8,
  },
  statusHeading: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  row: {
    gap: 4,
  },
  rowLabel: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  rowValue: {
    color: AppColors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
  },
  closeCta: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  closeCtaPressed: {
    opacity: 0.9,
  },
  closeCtaLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
