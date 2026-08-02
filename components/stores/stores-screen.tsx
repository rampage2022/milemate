import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import {
  StoresEmptyState,
  StoresErrorState,
  StoresLoadingState,
} from '@/components/stores/stores-content-states';
import { StoresMapView } from '@/components/stores/stores-map-view';
import { formatStoreWorkdayMembershipLabel } from '@/components/stores/stores-workday-membership-label';
import { useGestureInteractionCleanup } from '@/hooks/use-gesture-interaction-cleanup';
import { useStoresScreenData } from '@/hooks/use-stores-screen-data';
import type { Store } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { searchStores } from '@/utils/search-stores';
import {
  createDefaultStoresMapFilterState,
  sanitizeStoresMapFilterState,
  type StoresMapFilterState,
} from '@/utils/stores-map-filter-state';
import {
  applyStoresMapNavigationIntentToFilterState,
  clearStoresMapEntryReturnContext,
  consumeStoresMapNavigationIntent,
  createStoresMapInitialSelectionRequest,
  noteNormalStoresTabEntry,
  resolveStoresMapNavigationScope,
  shouldShowStoresMapPreviewBackButton,
  type StoresMapInitialSelectionRequest,
  type StoresMapNavigationIntent,
} from '@/utils/stores-map-navigation-intent';
import { getTodayDateString } from '@/utils/today-date';

export type StoresScope = 'today' | 'all';

export function StoresScreen() {
  const router = useRouter();
  useGestureInteractionCleanup('Stores');

  const [scope, setScope] = useState<StoresScope>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<StoresMapFilterState>(
    createDefaultStoresMapFilterState(),
  );
  const pendingNavigationIntentRef = useRef<StoresMapNavigationIntent | null>(null);
  const appliedNavigationIntentRef = useRef<StoresMapNavigationIntent | null>(null);
  const [initialSelectionRequest, setInitialSelectionRequest] =
    useState<StoresMapInitialSelectionRequest | null>(null);
  const [showPreviewBack, setShowPreviewBack] = useState(false);

  const {
    assignmentIndex,
    deliveryChecks,
    handleDeleteStore,
    items,
    loadError,
    loadStatus,
    orders,
    refresh,
    resolvedVisits,
    smartFilterIndex,
    storeGroups,
    templates,
  } = useStoresScreenData();

  useEffect(() => {
    setFilterState((current) =>
      sanitizeStoresMapFilterState({
        availableGroupIds: new Set(storeGroups.map((group) => group.id)),
        availableTemplateIds: new Set(templates.map((template) => template.id)),
        state: current,
      }),
    );
  }, [storeGroups, templates]);

  useFocusEffect(
    useCallback(() => {
      const staged = consumeStoresMapNavigationIntent();

      if (staged) {
        pendingNavigationIntentRef.current = staged;
      } else {
        noteNormalStoresTabEntry();
      }

      setShowPreviewBack(shouldShowStoresMapPreviewBackButton());

      return () => {
        clearStoresMapEntryReturnContext();
        setShowPreviewBack(false);
      };
    }, []),
  );

  useEffect(() => {
    if (loadStatus !== 'ready') {
      return;
    }

    const intent = pendingNavigationIntentRef.current;

    if (!intent || appliedNavigationIntentRef.current === intent) {
      return;
    }

    pendingNavigationIntentRef.current = null;
    appliedNavigationIntentRef.current = intent;
    setScope(resolveStoresMapNavigationScope(intent));
    setSearchQuery('');
    setFilterState((current) =>
      sanitizeStoresMapFilterState({
        availableGroupIds: new Set(storeGroups.map((group) => group.id)),
        availableTemplateIds: new Set(templates.map((template) => template.id)),
        state: applyStoresMapNavigationIntentToFilterState(intent),
      }),
    );

    if (intent.selectedStoreId) {
      setInitialSelectionRequest(createStoresMapInitialSelectionRequest(intent.selectedStoreId));
    }

    setShowPreviewBack(shouldShowStoresMapPreviewBackButton());
  }, [loadStatus, storeGroups, templates]);

  const handleBackToWorkdayPreview = useCallback(() => {
    clearStoresMapEntryReturnContext();
    setShowPreviewBack(false);
    router.navigate('/' as const);
  }, [router]);

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
      style={styles.container}
    >
      <View style={styles.inner}>
        {showLoading ? (
          <View style={styles.stateWrap}>
            <StoresLoadingState />
          </View>
        ) : null}
        {showError && loadError ? (
          <View style={styles.stateWrap}>
            <StoresErrorState
              message={loadError}
              onRetry={() => {
                void refresh();
              }}
            />
          </View>
        ) : null}
        {!showLoading && !showError ? (
          <StoresMapView
            assignmentIndex={assignmentIndex}
            deleteEnabled={scope === 'all'}
            deliveryChecks={deliveryChecks}
            items={displayItems}
            listEmptyComponent={emptyListState}
            membershipLabelForStore={membershipLabelForStore}
            onClearSearch={clearSearch}
            onDeleteStore={confirmDeleteStore}
            onOpenStore={openStore}
            onScopeChange={setScope}
            onSearchQueryChange={setSearchQuery}
            scope={scope}
            searchQuery={searchQuery}
            filterState={filterState}
            onFilterStateChange={setFilterState}
            orders={orders}
            resolvedVisits={resolvedVisits}
            smartFilterIndex={smartFilterIndex}
            storeGroups={storeGroups}
            templates={templates}
            onRefreshData={() => {
              void refresh();
            }}
            initialSelectionRequest={initialSelectionRequest}
            onBackToWorkdayPreview={
              showPreviewBack ? handleBackToWorkdayPreview : undefined
            }
            showPreviewBack={showPreviewBack}
          />
        ) : null}
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
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
