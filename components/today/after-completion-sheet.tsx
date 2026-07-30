import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';

type AfterCompletionSheetProps = {
  visible: boolean;
  storeName: string;
  onOpenDirections: () => void;
  onStayInApp: () => void;
};

export function AfterCompletionSheet({
  onOpenDirections,
  onStayInApp,
  storeName,
  visible,
}: AfterCompletionSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <Pressable onPress={onStayInApp} style={styles.backdrop} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Next stop ready</Text>
        <Text style={styles.subtitle}>{storeName}</Text>
        <Pressable onPress={onOpenDirections} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Open Directions</Text>
        </Pressable>
        <Pressable onPress={onStayInApp} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Stay in MileMate</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 15,
    marginBottom: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.startButton,
    borderRadius: AppSpacing.buttonRadius,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
  },
});
