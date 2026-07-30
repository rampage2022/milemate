import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { StoreOverviewLayout } from '@/components/store/store-overview-layout';
import { AppColors } from '@/components/shared/app-theme';
import { formatStoreAddress, type Store } from '@/types/store';
import { openStoreDirectionsSafely } from '@/utils/store-navigation';

type StoreInformationSectionProps = {
  store: Store;
};

function InfoRow({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress?: () => void;
  value: string;
}) {
  const content = (
    <>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, onPress && styles.rowValueAction]}>{value}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

export function StoreInformationSection({ store }: StoreInformationSectionProps) {
  const phone = store.managerPhone?.trim();

  function handleDirectionsPress() {
    openStoreDirectionsSafely(store);
  }

  function handlePhonePress() {
    if (!phone) {
      return;
    }

    void Linking.openURL(`tel:${phone}`);
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Store Information</Text>
      <View style={styles.card}>
        <InfoRow label="Address" value={formatStoreAddress(store)} />
        <InfoRow
          label="Manager"
          value={store.managerName?.trim() || 'Not added'}
        />
        <InfoRow
          label="Phone"
          onPress={phone ? handlePhonePress : undefined}
          value={phone || 'Not added'}
        />
        <InfoRow label="Directions" onPress={handleDirectionsPress} value="Open in Maps" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: StoreOverviewLayout.sectionGap,
  },
  sectionTitle: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: StoreOverviewLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingHorizontal: StoreOverviewLayout.cardPaddingH,
    paddingVertical: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  row: {
    gap: 2,
    minHeight: 48,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  rowValue: {
    color: AppColors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  rowValueAction: {
    color: AppColors.blue,
    fontWeight: '700',
  },
});
