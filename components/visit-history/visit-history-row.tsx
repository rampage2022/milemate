import { MileMateStatusPill } from '@/components/shared/milemate-status-pill';
import { AppColors } from '@/components/shared/app-theme';
import type { VisitHistoryItem } from '@/utils/visit-history';
import { formatVisitHistoryRowAccessibilityLabel } from '@/utils/visit-history';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type VisitHistoryRowProps = {
  item: VisitHistoryItem;
  onPress: (item: VisitHistoryItem) => void;
};

export function VisitHistoryRow({ item, onPress }: VisitHistoryRowProps) {
  const statusTone = item.hasIssue
    ? 'issue'
    : item.status === 'completed'
      ? 'completed'
      : 'skipped';

  return (
    <Pressable
      accessibilityLabel={formatVisitHistoryRowAccessibilityLabel(item)}
      accessibilityRole="button"
      onPress={() => {
        onPress(item);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.storeName}>
          {item.storeName}
        </Text>
        <Text numberOfLines={1} style={styles.address}>
          {item.address}
        </Text>
        <MileMateStatusPill label={item.reason} tone={statusTone} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.92,
  },
  copy: {
    gap: 4,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
});
