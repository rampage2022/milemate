import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeliveryScheduledTodayRow } from '@/hooks/use-deliveries-scheduled-today';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { formatStoreAddress } from '@/types/store';

type DeliveriesTodaySheetProps = {
  isLoading: boolean;
  onAddStopSuggestion: (storeId: string) => void;
  onClose: () => void;
  rows: DeliveryScheduledTodayRow[];
  visible: boolean;
};

export function DeliveriesTodaySheet({
  isLoading,
  onAddStopSuggestion,
  onClose,
  rows,
  visible,
}: DeliveriesTodaySheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.backdrop} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Deliveries scheduled today</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
            <Ionicons color={AppColors.textPrimary} name="close" size={24} />
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={AppColors.blue} style={styles.loader} />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No deliveries scheduled for today.</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {rows.map((row) => {
              const name = row.store ? getStoreDisplayName(row.store) : 'Unknown store';
              const address = row.store ? formatStoreAddress(row.store) : '';

              return (
                <View key={row.storeId} style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.storeName}>{name}</Text>
                    {address ? (
                      <Text numberOfLines={2} style={styles.address}>
                        {address}
                      </Text>
                    ) : null}
                    <Text style={styles.routeTag}>
                      {row.onRoute ? 'On today\u2019s route' : 'Not on route'}
                    </Text>
                  </View>
                  {!row.onRoute ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        onAddStopSuggestion(row.storeId);
                      }}
                      style={({ pressed }) => [
                        styles.addButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.addButtonText}>Add stop</Text>
                    </Pressable>
                  ) : (
                    <Ionicons color={AppColors.green} name="checkmark-circle" size={22} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
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
    maxHeight: '78%',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    paddingRight: 12,
  },
  loader: {
    marginVertical: 24,
  },
  empty: {
    color: AppColors.textMuted,
    fontSize: 15,
    marginVertical: 20,
  },
  list: {
    gap: 12,
    paddingBottom: 8,
  },
  row: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  routeTag: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: AppColors.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
});
