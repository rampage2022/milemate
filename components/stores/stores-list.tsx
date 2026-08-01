import type { ReactElement } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { SwipeActionRow } from '@/components/shared/swipe-action-row';
import { AppColors } from '@/components/shared/app-theme';
import { StoresLayout } from '@/components/stores/stores-layout';
import { StoresListRow } from '@/components/stores/stores-list-row';
import type { StoreListItem } from '@/hooks/use-stores-screen-data';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import type { Store } from '@/types/store';

type StoresListProps = {
  deleteEnabled: boolean;
  items: StoreListItem[];
  listEmptyComponent: ReactElement | null;
  membershipLabelForStore: (storeId: string) => string | null;
  onDeleteStore: (store: Store) => void;
  onOpenStore: (storeId: string) => void;
};

export function StoresList({
  deleteEnabled,
  items,
  listEmptyComponent,
  membershipLabelForStore,
  onDeleteStore,
  onOpenStore,
}: StoresListProps) {
  return (
    <FlatList
      data={items}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.store.id}
      contentContainerStyle={[
        styles.listContent,
        items.length === 0 && styles.listContentEmpty,
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={listEmptyComponent}
      onScrollBeginDrag={() => {
        Keyboard.dismiss();
      }}
      renderItem={({ item }) => (
        <SwipeActionRow
          enabled={deleteEnabled}
          rowId={item.store.id}
          rowSpacing={0}
          rightAction={{
            accessibilityLabel: `Delete ${getStoreDisplayName(item.store)}`,
            backgroundColor: AppColors.red,
            label: 'Delete',
            onPress: () => {
              onDeleteStore(item.store);
            },
          }}
        >
          <StoresListRow
            onPress={() => {
              onOpenStore(item.store.id);
            }}
            store={item.store}
            visit={item.visit}
            workdayMembershipLabel={membershipLabelForStore(item.store.id)}
          />
        </SwipeActionRow>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: StoresLayout.listRowGap,
  },
});
