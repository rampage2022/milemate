import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { workdayDockTotalHeight } from '@/components/navigation/workday-dock';
import { AppColors } from '@/components/shared/app-theme';
import { useWorkdayNavigation } from '@/contexts/workday-navigation-context';

type WorkdayMoreSheetProps = {
  onClose: () => void;
  visible: boolean;
};

type MoreRowProps = {
  label: string;
  onPress: () => void;
};

function MoreRow({ label, onPress }: MoreRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

export function WorkdayMoreSheet({ onClose, visible }: WorkdayMoreSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { handlers } = useWorkdayNavigation();
  const dockOffset = workdayDockTotalHeight(insets.bottom);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Dismiss menu" onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
          }}
          style={[styles.sheet, { marginBottom: dockOffset }]}
        >
          <Text style={styles.title}>Workday</Text>
          <MoreRow
            label="Add Stop"
            onPress={() => {
              onClose();
              handlers.onAddStop?.();
            }}
          />
          <MoreRow
            label="Edit Route"
            onPress={() => {
              onClose();
              handlers.onEditRoute?.();
            }}
          />
          <MoreRow
            label="Settings"
            onPress={() => {
              onClose();
              router.push('/(tabs)/settings' as const);
            }}
          />
          <MoreRow
            label="Stores"
            onPress={() => {
              onClose();
              router.push('/(tabs)/stores' as const);
            }}
          />
          <MoreRow
            label="Import Stores"
            onPress={() => {
              onClose();
              router.push('/store-import' as const);
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  title: {
    color: AppColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  row: {
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    backgroundColor: '#F3F4F6',
  },
  rowLabel: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
