import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';

import { DeliveryStatusSheet } from '@/components/store/delivery-status-sheet';
import { VisitLogInfoSheet } from '@/components/store/visit-log-info-sheet';
import { VisitLogScreen } from '@/components/store/visit-log-screen';
import { LastVisitCard } from '@/components/store/last-visit-card';
import { OrderLogSheet } from '@/components/store/order-log-sheet';
import { OrdersSummaryCard } from '@/components/store/orders-summary-card';
import { PendingOrdersSheet } from '@/components/store/pending-orders-sheet';
import { PlaceOrderSheet } from '@/components/store/place-order-sheet';
import { StoreInformationSection } from '@/components/store/store-information-section';
import { StoreOverviewLayout } from '@/components/store/store-overview-layout';
import { TodaysVisitCard } from '@/components/store/todays-visit-card';
import { AppColors } from '@/components/shared/app-theme';
import { useVisitAdvancement } from '@/contexts/visit-advancement-context';
import { ensureStoreOrderStoreIdRecovery } from '@/services/store-order-recovery';
import {
  createStoreOrder,
  getOrderHistoryForStore,
  getPendingStoreOrders,
  markStoreOrderDelivered,
} from '@/services/store-orders';
import { createStoreOrderDeliveryCheck, getLatestNotReceivedCheckForOrder } from '@/services/store-order-delivery-checks';
import { ensureStoreSeedData } from '@/services/seed-stores';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { getAfterCompletionDefault } from '@/services/workflow-preferences';
import { ensureStoreReverseGeocodedAddress } from '@/services/store-display-address';
import { getStoreById } from '@/services/stores';
import {
  addVisitNote,
  checkInVisit,
  getLastCompletedVisitForStore,
  getVisitForStoreOnDate,
  resolveAfterCompletionMode,
  setVisitAfterCompletionOverride,
} from '@/services/store-visits';
import {
  cycleAfterCompletionMode,
  type AfterCompletionMode,
} from '@/types/after-completion';
import { formatStoreAddress, type Store } from '@/types/store';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import type { StoreVisit } from '@/types/store-visit';
import { getTodayDateString } from '@/utils/today-date';

type StoreOverviewScreenProps = {
  storeId: string;
};

export function StoreOverviewScreen({ storeId }: StoreOverviewScreenProps) {
  const router = useRouter();
  const { beginVisitCompletion, isCompletionActive } = useVisitAdvancement();
  const [store, setStore] = useState<Store | null>(null);
  const [visit, setVisit] = useState<StoreVisit | null>(null);
  const [lastCompletedVisit, setLastCompletedVisit] = useState<StoreVisit | null>(null);
  const [pendingOrders, setPendingOrders] = useState<StoreOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<StoreOrder[]>([]);
  const [isOrderLogVisible, setIsOrderLogVisible] = useState(false);
  const [latestNotReceivedChecksByOrderId, setLatestNotReceivedChecksByOrderId] = useState<
    Record<string, StoreOrderDeliveryCheck | null>
  >({});
  const [isPlaceOrderVisible, setIsPlaceOrderVisible] = useState(false);
  const [isPendingOrdersVisible, setIsPendingOrdersVisible] = useState(false);
  const [deliveryStatusOrderId, setDeliveryStatusOrderId] = useState<string | null>(null);
  const [isOrderSaving, setIsOrderSaving] = useState(false);
  const [afterCompletionMode, setAfterCompletionMode] =
    useState<AfterCompletionMode>('open_directions');
  const [noteText, setNoteText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [visitLogInfoSheet, setVisitLogInfoSheet] = useState<
    'last-visit' | 'store-info' | null
  >(null);

  const refreshOrders = useCallback(async () => {
    const [loadedPending, loadedHistory] = await Promise.all([
      getPendingStoreOrders(storeId),
      getOrderHistoryForStore(storeId),
    ]);
    const checksByOrderId: Record<string, StoreOrderDeliveryCheck | null> = {};

    await Promise.all(
      loadedPending.map(async (order) => {
        checksByOrderId[order.id] = await getLatestNotReceivedCheckForOrder(order.id);
      }),
    );

    setPendingOrders(loadedPending);
    setOrderHistory(loadedHistory);
    setLatestNotReceivedChecksByOrderId(checksByOrderId);
  }, [storeId]);

  const loadStoreOverview = useCallback(async () => {
    setIsLoading(true);

    try {
      await ensureStoreSeedData();
      let loadedStore = await getStoreById(storeId);

      if (loadedStore) {
        loadedStore = await ensureStoreReverseGeocodedAddress(loadedStore);
      }
      const loadedVisit = await getVisitForStoreOnDate(storeId, getTodayDateString());
      const loadedLastVisit = await getLastCompletedVisitForStore(storeId, loadedVisit);

      setStore(loadedStore);
      setVisit(loadedVisit);
      setLastCompletedVisit(loadedLastVisit);
      await ensureStoreOrderStoreIdRecovery();
      await refreshOrders();

      if (loadedVisit) {
        setAfterCompletionMode(await resolveAfterCompletionMode(loadedVisit));
      } else {
        setAfterCompletionMode(await getAfterCompletionDefault());
      }
    } catch (error) {
      console.error('[StoreOverview] load failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, refreshOrders]);

  useFocusEffect(
    useCallback(() => {
      void loadStoreOverview();
    }, [loadStoreOverview]),
  );

  const handleCheckIn = async () => {
    if (!visit) {
      return;
    }

    setIsSaving(true);

    try {
      const updated = await checkInVisit(visit.id);
      setVisit(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCycleAfterCompletion = async () => {
    if (!visit) {
      return;
    }

    const nextMode = cycleAfterCompletionMode(afterCompletionMode);
    setAfterCompletionMode(nextMode);

    const updated = await setVisitAfterCompletionOverride(visit.id, nextMode);
    if (updated) {
      setVisit(updated);
    }
  };

  const handleCompleteVisit = async () => {
    if (!visit || !store || isCompletionActive) {
      return;
    }

    setIsSaving(true);

    try {
      const started = await beginVisitCompletion({
        visitId: visit.id,
        completedStoreId: store.id,
        completedStoreName: getStoreDisplayName(store),
      });

      if (started) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[StoreOverview] completion navigation triggered', {
            canGoBack: router.canGoBack(),
            method: router.canGoBack() ? 'back' : 'navigate-index',
          });
        }

        if (router.canGoBack()) {
          router.back();
        } else {
          router.navigate('/' as const);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!visit) {
      return;
    }

    setIsSaving(true);

    try {
      const updated = await addVisitNote(visit.id, noteText);
      if (updated) {
        setVisit(updated);
        setNoteText('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlaceOrder = async (input: {
    expectedDeliveryDate: string;
    note?: string;
    placedAt: string;
  }) => {
    setIsOrderSaving(true);

    try {
      await createStoreOrder({
        expectedDeliveryDate: input.expectedDeliveryDate,
        note: input.note,
        placedAt: input.placedAt,
        storeId,
      });
      setIsPlaceOrderVisible(false);
      await refreshOrders();
    } finally {
      setIsOrderSaving(false);
    }
  };

  const handleDeliveryStatusPress = (orderId: string) => {
    setDeliveryStatusOrderId(orderId);
  };

  const handleCloseDeliveryStatus = () => {
    setDeliveryStatusOrderId(null);
  };

  const handleDeliveredSelected = async () => {
    if (!deliveryStatusOrderId) {
      return;
    }

    setIsOrderSaving(true);

    try {
      await markStoreOrderDelivered(deliveryStatusOrderId);
      await refreshOrders();
      setDeliveryStatusOrderId(null);
      setIsPendingOrdersVisible(false);
    } finally {
      setIsOrderSaving(false);
    }
  };

  const handleNotReceivedSelected = async () => {
    if (!deliveryStatusOrderId) {
      return;
    }

    setIsOrderSaving(true);

    try {
      await createStoreOrderDeliveryCheck({
        orderId: deliveryStatusOrderId,
        outcome: 'not_received',
        storeId,
        visitId: visit?.id,
      });
      await refreshOrders();
      setDeliveryStatusOrderId(null);
    } finally {
      setIsOrderSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={AppColors.blue} size="large" />
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Store not found.</Text>
      </SafeAreaView>
    );
  }

  const isVisitLogActive = visit?.status === 'checked_in';

  if (isVisitLogActive && visit) {
    return (
      <>
        <StatusBar style="light" />
        <VisitLogScreen
          isCompletionActive={isCompletionActive}
          isSaving={isSaving}
          lastCompletedVisit={lastCompletedVisit}
          latestNotReceivedChecksByOrderId={latestNotReceivedChecksByOrderId}
          noteText={noteText}
          onAddNote={() => {
            void handleAddNote();
          }}
          onBack={() => {
            router.back();
          }}
          onChangeNoteText={setNoteText}
          onCompleteVisit={() => {
            void handleCompleteVisit();
          }}
          onOpenDelivery={() => {
            if (pendingOrders.length === 1) {
              setDeliveryStatusOrderId(pendingOrders[0]!.id);
              return;
            }

            setIsPendingOrdersVisible(true);
          }}
          onOpenLastVisitSummary={() => {
            setVisitLogInfoSheet('last-visit');
          }}
          onOpenStoreInfo={() => {
            setVisitLogInfoSheet('store-info');
          }}
          orderHistory={orderHistory}
          pendingOrders={pendingOrders}
          store={store}
          visit={visit}
        />
        <VisitLogInfoSheet
          kind={visitLogInfoSheet}
          lastCompletedVisit={lastCompletedVisit}
          onClose={() => {
            setVisitLogInfoSheet(null);
          }}
          store={store}
        />
        <OrderLogSheet
          onClose={() => {
            setIsOrderLogVisible(false);
          }}
          orders={orderHistory}
          unlinkedCount={0}
          visible={isOrderLogVisible}
        />
        <PlaceOrderSheet
          isSaving={isOrderSaving}
          onClose={() => {
            setIsPlaceOrderVisible(false);
          }}
          onSave={handlePlaceOrder}
          visible={isPlaceOrderVisible}
        />
        <PendingOrdersSheet
          isSaving={isOrderSaving}
          onClose={() => {
            setIsPendingOrdersVisible(false);
          }}
          onDeliveryStatusPress={handleDeliveryStatusPress}
          orders={pendingOrders}
          visible={isPendingOrdersVisible}
        />
        <DeliveryStatusSheet
          isSaving={isOrderSaving}
          onClose={handleCloseDeliveryStatus}
          onDelivered={() => {
            void handleDeliveredSelected();
          }}
          onNotReceived={() => {
            void handleNotReceivedSelected();
          }}
          visible={deliveryStatusOrderId !== null}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.storeName}>{getStoreDisplayName(store)}</Text>
          <Text style={styles.address}>{formatStoreAddress(store)}</Text>
        </View>

        <TodaysVisitCard
          afterCompletionMode={afterCompletionMode}
          isCompletionActive={isCompletionActive}
          isSaving={isSaving}
          onCheckIn={() => {
            void handleCheckIn();
          }}
          onCompleteVisit={() => {
            void handleCompleteVisit();
          }}
          onCycleAfterCompletion={() => {
            void handleCycleAfterCompletion();
          }}
          visit={visit}
        />

        <OrdersSummaryCard
          isSaving={isOrderSaving}
          latestNotReceivedChecksByOrderId={latestNotReceivedChecksByOrderId}
          onDeliveryStatusPress={handleDeliveryStatusPress}
          onPlaceOrder={() => {
            setIsPlaceOrderVisible(true);
          }}
          onViewOrderLog={() => {
            setIsOrderLogVisible(true);
          }}
          onViewPendingOrders={() => {
            setIsPendingOrdersVisible(true);
          }}
          orderLogCount={orderHistory.length}
          pendingOrders={pendingOrders}
        />

        <OrderLogSheet
          onClose={() => {
            setIsOrderLogVisible(false);
          }}
          orders={orderHistory}
          unlinkedCount={0}
          visible={isOrderLogVisible}
        />

        <PlaceOrderSheet
          isSaving={isOrderSaving}
          onClose={() => {
            setIsPlaceOrderVisible(false);
          }}
          onSave={handlePlaceOrder}
          visible={isPlaceOrderVisible}
        />

        <PendingOrdersSheet
          isSaving={isOrderSaving}
          onClose={() => {
            setIsPendingOrdersVisible(false);
          }}
          onDeliveryStatusPress={handleDeliveryStatusPress}
          orders={pendingOrders}
          visible={isPendingOrdersVisible}
        />

        <DeliveryStatusSheet
          isSaving={isOrderSaving}
          onClose={handleCloseDeliveryStatus}
          onDelivered={() => {
            void handleDeliveredSelected();
          }}
          onNotReceived={() => {
            void handleNotReceivedSelected();
          }}
          visible={deliveryStatusOrderId !== null}
        />

        <LastVisitCard lastCompletedVisit={lastCompletedVisit} />

        <StoreInformationSection store={store} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: AppColors.background,
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    gap: StoreOverviewLayout.cardGap,
    padding: StoreOverviewLayout.screenPadding,
    paddingBottom: 32,
  },
  back: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  header: {
    gap: 4,
    marginBottom: StoreOverviewLayout.contentGap - StoreOverviewLayout.cardGap,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: StoreOverviewLayout.titleSize,
    fontWeight: '800',
    lineHeight: 32,
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: StoreOverviewLayout.subtitleSize,
    lineHeight: 21,
  },
  errorText: {
    color: AppColors.red,
    fontSize: 16,
  },
});
