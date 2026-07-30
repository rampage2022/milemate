import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { StoreInformationSection } from '@/components/store/store-information-section';
import { LastVisitCard } from '@/components/store/last-visit-card';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import type { StoreVisit } from '@/types/store-visit';
import type { Store } from '@/types/store';

type VisitLogInfoSheetProps = {
  kind: 'last-visit' | 'store-info' | null;
  lastCompletedVisit: StoreVisit | null;
  onClose: () => void;
  store: Store;
};

export function VisitLogInfoSheet({
  kind,
  lastCompletedVisit,
  onClose,
  store,
}: VisitLogInfoSheetProps) {
  const insets = useSafeAreaInsets();
  const visible = kind !== null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.backdrop} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {kind === 'store-info' ? 'Store Info' : 'Last Visit'}
          </Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
            <Ionicons color={AppColors.textPrimary} name="close" size={24} />
          </Pressable>
        </View>
        {kind === 'store-info' ? <StoreInformationSection store={store} /> : null}
        {kind === 'last-visit' ? (
          <LastVisitCard lastCompletedVisit={lastCompletedVisit} />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
  },
  sheet: {
    backgroundColor: MileMateTokens.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 16,
    maxHeight: '78%',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
});
