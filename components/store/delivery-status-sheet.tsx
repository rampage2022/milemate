import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';

type DeliveryStatusSheetProps = {
  isSaving: boolean;
  onClose: () => void;
  onDelivered: () => void;
  onNotReceived: () => void;
  visible: boolean;
};

export function DeliveryStatusSheet({
  isSaving,
  onClose,
  onDelivered,
  onNotReceived,
  visible,
}: DeliveryStatusSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Cancel delivery status update"
          onPress={onClose}
          style={styles.backdropPress}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>Delivery Status</Text>
          <Text style={styles.subtitle}>Was this order delivered?</Text>

          <Pressable
            accessibilityLabel="Mark order as delivered"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onDelivered}
            style={({ pressed }) => [
              styles.optionButton,
              styles.deliveredOption,
              isSaving && styles.optionDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.deliveredOptionText}>Delivered</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Record delivery not received"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onNotReceived}
            style={({ pressed }) => [
              styles.optionButton,
              styles.pendingOption,
              isSaving && styles.optionDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.pendingOptionText}>Not Received</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Cancel delivery status update"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onClose}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
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
    gap: 10,
    padding: 20,
    paddingBottom: 28,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },
  optionButton: {
    alignItems: 'center',
    borderRadius: AppSpacing.buttonRadius,
    justifyContent: 'center',
    minHeight: 48,
  },
  deliveredOption: {
    backgroundColor: AppColors.green,
  },
  deliveredOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pendingOption: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderWidth: 1,
  },
  pendingOptionText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButtonText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
});
