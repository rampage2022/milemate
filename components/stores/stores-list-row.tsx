import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { VisitStatusBadge } from '@/components/shared/visit-status-badge';
import { AppColors } from '@/components/shared/app-theme';
import { StoresLayout } from '@/components/stores/stores-layout';
import { formatStoreAddress, type Store } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import type { StoreVisit } from '@/types/store-visit';

type StoresListRowProps = {
  onOpenStore?: () => void;
  onPress: () => void;
  selected?: boolean;
  store: Store;
  visit: StoreVisit | null;
  workdayMembershipLabel?: string | null;
};

export function StoresListRow({
  onOpenStore,
  onPress,
  selected = false,
  store,
  visit,
  workdayMembershipLabel,
}: StoresListRowProps) {
  const displayName = getStoreDisplayName(store);
  const storeNumberLabel =
    store.storeNumber && store.storeNumber.trim().length > 0
      ? `#${store.storeNumber.trim()}`
      : null;
  const address = formatStoreAddress(store);

  const accessibilityLabel = [
    displayName,
    storeNumberLabel,
    address,
    workdayMembershipLabel ? `Saved workday ${workdayMembershipLabel}` : null,
    visit ? `Today's visit ${visit.status}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text allowFontScaling numberOfLines={2} style={styles.name}>
            {displayName}
          </Text>
          {visit ? <VisitStatusBadge status={visit.status} /> : null}
        </View>
        {storeNumberLabel ? (
          <Text allowFontScaling style={styles.storeNumber}>
            Store {storeNumberLabel}
          </Text>
        ) : null}
        <Text allowFontScaling numberOfLines={2} style={styles.address}>
          {address}
        </Text>
        {workdayMembershipLabel ? (
          <Text allowFontScaling numberOfLines={1} style={styles.workday}>
            {workdayMembershipLabel}
          </Text>
        ) : null}
        {visit ? (
          <Text allowFontScaling style={styles.routeMeta}>
            Route order {visit.routeOrder}
          </Text>
        ) : null}
      </View>
      {onOpenStore ? (
        <Pressable
          accessibilityLabel={`Open ${displayName}`}
          accessibilityRole="button"
          hitSlop={6}
          onPress={(event) => {
            event.stopPropagation();
            onOpenStore();
          }}
          style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
        >
          <Text allowFontScaling style={styles.openButtonText}>
            Open
          </Text>
        </Pressable>
      ) : (
        <Ionicons
          accessibilityElementsHidden
          color={AppColors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name="chevron-forward"
          size={18}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: StoresLayout.listRowRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: StoresLayout.listRowMinHeight,
    paddingHorizontal: StoresLayout.listRowPaddingH,
    paddingVertical: StoresLayout.listRowPaddingV,
  },
  rowSelected: {
    borderColor: AppColors.blue,
    borderWidth: 1.5,
  },
  openButton: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 52,
    paddingHorizontal: 8,
  },
  openButtonText: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.92,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  name: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  storeNumber: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  workday: {
    color: AppColors.blue,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  routeMeta: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
