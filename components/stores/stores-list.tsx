import type { ReactElement } from 'react';
import { FlatList as RNFlatList, Keyboard, StyleSheet, View } from 'react-native';
import { FlatList as GHFlatList } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

import { SwipeActionRow } from '@/components/shared/swipe-action-row';
import { AppColors } from '@/components/shared/app-theme';
import { StoresLayout } from '@/components/stores/stores-layout';
import { StoresListRow } from '@/components/stores/stores-list-row';
import type { StoreListItem } from '@/hooks/use-stores-screen-data';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import type { Store } from '@/types/store';

const AnimatedFlatList = Animated.createAnimatedComponent(GHFlatList<StoreListItem>);

type StoresListProps = {
  deleteEnabled: boolean;
  items: StoreListItem[];
  listEmptyComponent: ReactElement | null;
  listContentBottomPadding?: number;
  listScrollY?: SharedValue<number>;
  membershipLabelForStore: (storeId: string) => string | null;
  onDeleteStore: (store: Store) => void;
  onOpenStore: (storeId: string) => void;
  onSelectStore: (storeId: string) => void;
  selectedStoreId?: string | null;
  useGestureHandlerFlatList?: boolean;
};

export function StoresList({
  deleteEnabled,
  items,
  listEmptyComponent,
  listContentBottomPadding = 24,
  listScrollY,
  membershipLabelForStore,
  onDeleteStore,
  onOpenStore,
  onSelectStore,
  selectedStoreId = null,
  useGestureHandlerFlatList = false,
}: StoresListProps) {
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (listScrollY) {
        listScrollY.value = event.contentOffset.y;
      }
    },
  });

  if (useGestureHandlerFlatList && listScrollY) {
    return (
      <AnimatedFlatList
        bounces
        data={items}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item: StoreListItem) => item.store.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listContentBottomPadding },
          items.length === 0 && styles.listContentEmpty,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={listEmptyComponent}
        nestedScrollEnabled
        onScroll={scrollHandler}
        onScrollBeginDrag={() => {
          Keyboard.dismiss();
        }}
        renderItem={({ item }: { item: StoreListItem }) => (
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
              onOpenStore={() => {
                onOpenStore(item.store.id);
              }}
              onPress={() => {
                onSelectStore(item.store.id);
              }}
              selected={selectedStoreId === item.store.id}
              store={item.store}
              visit={item.visit}
              workdayMembershipLabel={membershipLabelForStore(item.store.id)}
            />
          </SwipeActionRow>
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
      />
    );
  }

  const ListComponent = useGestureHandlerFlatList ? GHFlatList : RNFlatList;

  return (
    <ListComponent
      data={items}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item: StoreListItem) => item.store.id}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: listContentBottomPadding },
        items.length === 0 && styles.listContentEmpty,
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={listEmptyComponent}
      nestedScrollEnabled
      onScrollBeginDrag={() => {
        Keyboard.dismiss();
      }}
      renderItem={({ item }: { item: StoreListItem }) => (
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
            onOpenStore={() => {
              onOpenStore(item.store.id);
            }}
            onPress={() => {
              onSelectStore(item.store.id);
            }}
            selected={selectedStoreId === item.store.id}
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
  listContent: {},
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: StoresLayout.listRowGap,
  },
});
