import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import type { VisitLogSheetAction } from '@/utils/visit-log-presentation';

type VisitLogStoreActionsSheetProps = {
  actions: VisitLogSheetAction[];
  onClose: () => void;
  onSelectAction: (actionId: VisitLogSheetAction['id']) => void;
  visible: boolean;
};

export function VisitLogStoreActionsSheet({
  actions,
  onClose,
  onSelectAction,
  visible,
}: VisitLogStoreActionsSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close store actions" onPress={onClose} style={styles.backdropPress} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} accessibilityElementsHidden importantForAccessibility="no" />
          <View style={styles.header}>
            <Text style={styles.title}>Store Actions</Text>
            <Pressable
              accessibilityLabel="Close store actions"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
            >
              <Ionicons color={AppColors.textPrimary} name="close" size={24} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {actions.map((action) => (
              <Pressable
                key={action.id}
                accessibilityHint={action.accessibilityHint}
                accessibilityLabel={action.accessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled: action.disabled }}
                disabled={action.disabled}
                onPress={() => {
                  if (action.disabled) {
                    return;
                  }

                  onSelectAction(action.id);
                }}
                style={({ pressed }) => [
                  styles.actionCell,
                  action.disabled && styles.actionCellDisabled,
                  pressed && !action.disabled && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: `${action.accentColor}22` },
                  ]}
                >
                  <Ionicons color={action.accentColor} name={action.icon} size={22} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                {action.secondaryLine ? (
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.actionSecondary,
                      { color: action.disabled ? AppColors.textMuted : action.accentColor },
                    ]}
                  >
                    {action.secondaryLine}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
  },
  actionCell: {
    alignItems: 'flex-start',
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: MileMateTokens.radiusCard,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 6,
    minHeight: 112,
    padding: 12,
  },
  actionCellDisabled: {
    opacity: 0.55,
  },
  actionIconCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionTitle: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  actionSecondary: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.88,
  },
});
