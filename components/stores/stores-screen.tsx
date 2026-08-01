import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import {
  StoresEmptyState,
  StoresErrorState,
  StoresLoadingState,
} from '@/components/stores/stores-content-states';
import { StoresHeader } from '@/components/stores/stores-header';
import { StoresLayout } from '@/components/stores/stores-layout';
import { StoresList } from '@/components/stores/stores-list';
import { StoresMapView } from '@/components/stores/stores-map-view';
import { StoresSearchField } from '@/components/stores/stores-search-field';
import { StoresSegmentedControl } from '@/components/stores/stores-segmented-control';
import { formatStoreWorkdayMembershipLabel } from '@/components/stores/stores-workday-membership-label';
import { useGestureInteractionCleanup } from '@/hooks/use-gesture-interaction-cleanup';
import { useStoresScreenData } from '@/hooks/use-stores-screen-data';
import type { Store } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { searchStores } from '@/utils/search-stores';
import { getTodayDateString } from '@/utils/today-date';

export type StoresViewMode = 'list' | 'map';
export type StoresScope = 'today' | 'all';

export function StoresScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useGestureInteractionCleanup('Stores');

  const [viewMode, setViewMode] = useState<StoresViewMode>('list');
  const [scope, setScope] = useState<StoresScope>('today');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    assignmentIndex,
    handleDeleteStore,
    items,
    loadError,
    loadStatus,
    refresh,
    templates,
  } = useStoresScreenData();

  const templatesById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );

  const scopedItems = useMemo(() => {
    if (scope === 'all') {
      return items;
    }

    const today = getTodayDateString();

    return items.filter(
      (item) => item.visit && item.visit.scheduledDate === today,
    );
  }, [items, scope]);

  const displayItems = useMemo(() => {
    const stores = scopedItems.map((item) => item.store);
    const matchedStores = searchStores(stores, searchQuery);
    const orderByStoreId = new Map(
      matchedStores.map((store, index) => [store.id, index]),
    );

    return scopedItems
      .filter((item) => orderByStoreId.has(item.store.id))
      .sort(
        (left, right) =>
          (orderByStoreId.get(left.store.id) ?? 0) -
          (orderByStoreId.get(right.store.id) ?? 0),
      );
  }, [scopedItems, searchQuery]);

  const displayStores = useMemo(
    () => displayItems.map((item) => item.store),
    [displayItems],
  );

  const libraryCount = items.length;
  const scopedCount = scopedItems.length;
  const headerSubtitle =
    loadStatus === 'ready'
      ? scope === 'today'
        ? `${scopedCount} on today’s route · ${libraryCount} saved`
        : `${libraryCount} saved store${libraryCount === 1 ? '' : 's'}`
      : undefined;

  const membershipLabelForStore = useCallback(
    (storeId: string) =>
      formatStoreWorkdayMembershipLabel({
        assignment: assignmentIndex?.byStoreId.get(storeId),
        templatesById,
      }),
    [assignmentIndex, templatesById],
  );

  const confirmDeleteStore = useCallback(
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
              void handleDeleteStore(store);
            },
          },
        ],
      );
    },
    [handleDeleteStore],
  );

  const openStore = useCallback(
    (storeId: string) => {
      router.push(`/store/${storeId}`);
    },
    [router],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const emptyListState = useMemo(() => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length > 0) {
      return (
        <StoresEmptyState
          action={{
            accessibilityLabel: 'Clear store search',
            label: 'Clear search',
            onPress: clearSearch,
          }}
          message="Try a different name, store number, or address."
          title="No stores match your search"
        />
      );
    }

    if (scope === 'today') {
      return (
        <StoresEmptyState
          action={{
            accessibilityLabel: 'Go to Home tab',
            label: 'Go to Home',
            onPress: () => {
              router.push('/' as const);
            },
          }}
          message="Build or start a workday on Home to schedule stores for today."
          secondaryAction={{
            accessibilityLabel: 'Show all saved stores',
            label: 'Show all stores',
            onPress: () => {
              setScope('all');
            },
          }}
          title="No stores scheduled today"
        />
      );
    }

    return (
      <StoresEmptyState
        action={{
          accessibilityLabel: 'Import stores',
          label: 'Import stores',
          onPress: () => {
            router.push('/store-import' as const);
          },
        }}
        message="Import a CSV or add stops while building a route to grow your library."
        title="Your store library is empty"
      />
    );
  }, [clearSearch, router, scope, searchQuery]);

  const showLoading = loadStatus === 'idle' || loadStatus === 'loading';
  const showError = loadStatus === 'error';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.inner}>
        <StoresHeader subtitle={headerSubtitle} />

        <View style={styles.controls}>
          <StoresSegmentedControl
            onChange={setViewMode}
            segments={[
              {
                accessibilityLabel: 'List view',
                id: 'list',
                label: 'List',
              },
              {
                accessibilityLabel: 'Map view',
                id: 'map',
                label: 'Map',
              },
            ]}
            value={viewMode}
          />
          <StoresSegmentedControl
            onChange={setScope}
            segments={[
              {
                accessibilityLabel: 'Stores on today’s route',
                id: 'today',
                label: 'Today',
              },
              {
                accessibilityLabel: 'All saved stores',
                id: 'all',
                label: 'All Stores',
              },
            ]}
            value={scope}
          />
          <StoresSearchField
            onChangeText={setSearchQuery}
            onClear={clearSearch}
            value={searchQuery}
          />
        </View>

        <View style={styles.content}>
          {showLoading ? <StoresLoadingState /> : null}
          {showError && loadError ? (
            <StoresErrorState
              message={loadError}
              onRetry={() => {
                void refresh();
              }}
            />
          ) : null}
          {!showLoading && !showError && viewMode === 'list' ? (
            <StoresList
              deleteEnabled={scope === 'all'}
              items={displayItems}
              listEmptyComponent={emptyListState}
              membershipLabelForStore={membershipLabelForStore}
              onDeleteStore={confirmDeleteStore}
              onOpenStore={openStore}
            />
          ) : null}
          {!showLoading && !showError && viewMode === 'map' ? (
            <StoresMapView
              onOpenStore={openStore}
              stores={displayStores}
              workdayAssignments={assignmentIndex}
            />
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingBottom: AppSpacing.tabBarContentHeight,
    paddingHorizontal: StoresLayout.horizontalPadding,
  },
  controls: {
    gap: StoresLayout.contentGap,
    marginBottom: StoresLayout.contentGap,
  },
  content: {
    flex: 1,
  },
});
