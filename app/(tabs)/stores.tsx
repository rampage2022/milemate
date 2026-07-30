import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppColors } from '@/components/shared/app-theme';
import { SwipeActionRow } from '@/components/shared/swipe-action-row';
import { VisitStatusBadge } from '@/components/shared/visit-status-badge';
import { useGestureInteractionCleanup } from '@/hooks/use-gesture-interaction-cleanup';
import { ensureReadableAddressesForStores } from '@/services/store-display-address';
import { ensureStoreSeedData } from '@/services/seed-stores';
import { deleteStore, getStores } from '@/services/stores';
import { getTodayVisits } from '@/services/store-visits';
import { formatStoreAddress, type Store } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import type { StoreVisit } from '@/types/store-visit';
import { getTodayDateString } from '@/utils/today-date';

type StoresView = 'today' | 'all';

type StoreListItem = {
  store: Store;
  visit: StoreVisit | null;
};

export default function StoresScreen() {
  const router = useRouter();
  useGestureInteractionCleanup('Stores');
  const [view, setView] = useState<StoresView>('today');
  const [items, setItems] = useState<StoreListItem[]>([]);

  const loadStores = useCallback(async () => {
    await ensureStoreSeedData();
    const stores = await getStores();
    const readableById = await ensureReadableAddressesForStores(stores);
    const enrichedStores = stores.map((store) => readableById[store.id] ?? store);
    const visits = await getTodayVisits();
    const visitByStoreId = new Map(visits.map((visit) => [visit.storeId, visit]));

    const mapped = enrichedStores.map((store) => ({
      store,
      visit: visitByStoreId.get(store.id) ?? null,
    }));

    setItems(mapped);
  }, []);

  const handleDeleteStore = useCallback(
    (store: Store) => {
      Alert.alert(
        'Delete store?',
        `Permanently delete ${getStoreDisplayName(store)} from your library? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void deleteStore(store.id).then((deleted) => {
                if (deleted) {
                  void loadStores();
                }
              });
            },
          },
        ],
      );
    },
    [loadStores],
  );

  useFocusEffect(
    useCallback(() => {
      void loadStores();
    }, [loadStores]),
  );

  const visibleItems = useMemo(() => {
    if (view === 'all') {
      return items;
    }

    const today = getTodayDateString();

    return items.filter(
      (item) => item.visit && item.visit.scheduledDate === today,
    );
  }, [items, view]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Stores</Text>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setView('today')}
          style={[styles.toggleButton, view === 'today' && styles.toggleActive]}
        >
          <Text
            style={[
              styles.toggleText,
              view === 'today' && styles.toggleTextActive,
            ]}
          >
            Today
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView('all')}
          style={[styles.toggleButton, view === 'all' && styles.toggleActive]}
        >
          <Text
            style={[
              styles.toggleText,
              view === 'all' && styles.toggleTextActive,
            ]}
          >
            All Stores
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.store.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No stores found for this view.</Text>
        }
        renderItem={({ item }) => (
          <SwipeActionRow
            enabled={view === 'all'}
            rowId={item.store.id}
            rowSpacing={12}
            rightAction={{
              accessibilityLabel: `Delete ${getStoreDisplayName(item.store)}`,
              backgroundColor: AppColors.red,
              label: 'Delete',
              onPress: () => {
                handleDeleteStore(item.store);
              },
            }}
          >
            <Pressable
              onPress={() => {
                router.push(`/store/${item.store.id}`);
              }}
              style={styles.row}
            >
              <View style={styles.rowCopy}>
                <Text style={styles.storeName}>{getStoreDisplayName(item.store)}</Text>
                <Text style={styles.address}>{formatStoreAddress(item.store)}</Text>
                {item.visit ? (
                  <Text style={styles.meta}>Route order {item.visit.routeOrder}</Text>
                ) : null}
              </View>
              {item.visit ? <VisitStatusBadge status={item.visit.status} /> : null}
            </Pressable>
          </SwipeActionRow>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  toggleRow: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 4,
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  toggleActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: AppColors.textPrimary,
    fontWeight: '700',
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '700',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
  meta: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    color: AppColors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
