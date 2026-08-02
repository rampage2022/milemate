import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import type { VisitSkipReason } from '@/types/store-visit';
import { SKIP_REASON_LABELS } from '@/utils/milemate-status';

export const VISIT_LOG_SKIP_REASONS: VisitSkipReason[] = [
  'store_closed',
  'receiving_closed',
  'no_delivery',
  'manager_unavailable',
  'unable_to_access',
  'other',
];

type VisitLogSkipSheetProps = {
  onClose: () => void;
  onConfirmSkip: (reason: VisitSkipReason) => void;
  suggestedReason: VisitSkipReason | null;
  visible: boolean;
};

export function VisitLogSkipSheet({
  onClose,
  onConfirmSkip,
  suggestedReason,
  visible,
}: VisitLogSkipSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close skip stop" onPress={onClose} style={styles.backdropPress} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} accessibilityElementsHidden importantForAccessibility="no" />
          <View style={styles.header}>
            <Text style={styles.title}>Skip Stop</Text>
            <Pressable accessibilityLabel="Close skip stop" accessibilityRole="button" hitSlop={8} onPress={onClose}>
              <Ionicons color={AppColors.textPrimary} name="close" size={24} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Choose a reason. The stop will be marked skipped after you confirm.</Text>

          <View style={styles.list}>
            {VISIT_LOG_SKIP_REASONS.map((reason) => {
              const suggested = suggestedReason === reason;

              return (
                <Pressable
                  key={reason}
                  accessibilityLabel={`Skip because ${SKIP_REASON_LABELS[reason]}${suggested ? ', suggested' : ''}`}
                  accessibilityRole="button"
                  onPress={() => {
                    onConfirmSkip(reason);
                  }}
                  style={({ pressed }) => [styles.reasonRow, pressed && styles.pressed]}
                >
                  <Text style={styles.reasonLabel}>{SKIP_REASON_LABELS[reason]}</Text>
                  {suggested ? <Text style={styles.suggestedBadge}>Suggested</Text> : null}
                  <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
                </Pressable>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>Cancel</Text>
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
    backgroundColor: MileMateTokens.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: AppColors.textMuted,
    borderRadius: 2,
    height: 4,
    opacity: 0.35,
    width: 36,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 8,
  },
  reasonRow: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonLabel: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  suggestedBadge: {
    color: AppColors.blue,
    fontSize: 12,
    fontWeight: '700',
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 8,
  },
  cancelText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});

export function suggestVisitLogSkipReason(input: {
  receivingPassed: boolean;
  storeIsClosed: boolean;
}): VisitSkipReason | null {
  if (input.storeIsClosed) {
    return 'store_closed';
  }

  if (input.receivingPassed) {
    return 'receiving_closed';
  }

  return null;
}
