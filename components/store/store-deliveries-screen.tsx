import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MileMateDatePicker } from '@/components/shared/milemate-date-picker';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import { getLatestNotReceivedCheckForOrder } from '@/services/store-order-delivery-checks';
import {
  confirmStoreOrderDeliveredWithUndo,
  confirmStoreOrderMissedWithUndo,
  createPastDeliveryWithOutcome,
  createScheduledStoreDelivery,
  undoStoreOrderConfirmation,
  type StoreOrderConfirmationUndoSnapshot,
} from '@/services/store-order-delivery-confirmation';
import { getOrdersForCanonicalStore } from '@/services/store-orders';
import { getStoreById } from '@/services/stores';
import type { Store } from '@/types/store';
import type { StoreOrder } from '@/types/store-order';
import type { StoreOrderDeliveryCheck } from '@/types/store-order-delivery-check';
import { buildVisitLogStoreIdentity } from '@/utils/store-identity-presentation';
import {
  buildStoreDeliveriesNeedsConfirmationQueue,
  buildStoreDeliveriesUpcomingQueue,
  STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS,
} from '@/utils/store-deliveries-queue';
import { resolveStoreDeliveryNewEntryAction } from '@/utils/store-delivery-new-entry';
import {
  formatStoreOrderDateString,
  formatStoreOrderDeliveryDate,
} from '@/utils/store-order-presentation';

type StoreDeliveriesScreenProps = {
  storeId: string;
};

type UndoState = {
  label: string;
  snapshot: StoreOrderConfirmationUndoSnapshot;
};

export function StoreDeliveriesScreen({ storeId }: StoreDeliveriesScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [checksByOrderId, setChecksByOrderId] = useState<
    Record<string, StoreOrderDeliveryCheck | null>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDeliveries = useCallback(async () => {
    setIsLoading(true);

    try {
      const [loadedStore, remap] = await Promise.all([
        getStoreById(storeId),
        getStoreImportIdRemap(),
      ]);
      const loadedOrders = await getOrdersForCanonicalStore(storeId, remap);
      const checks: Record<string, StoreOrderDeliveryCheck | null> = {};

      await Promise.all(
        loadedOrders.map(async (order) => {
          checks[order.id] = await getLatestNotReceivedCheckForOrder(order.id);
        }),
      );

      setStore(loadedStore);
      setOrders(loadedOrders);
      setChecksByOrderId(checks);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const needsConfirmation = useMemo(
    () =>
      buildStoreDeliveriesNeedsConfirmationQueue({
        orders,
        checksByOrderId,
      }),
    [checksByOrderId, orders],
  );

  const upcoming = useMemo(
    () =>
      buildStoreDeliveriesUpcomingQueue({
        orders,
        checksByOrderId,
      }),
    [checksByOrderId, orders],
  );

  const storeTitle = store ? buildVisitLogStoreIdentity(store).title : '';

  function clearUndoTimer() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  function showUndoBanner(input: UndoState) {
    clearUndoTimer();
    setUndoState(input);
    undoTimerRef.current = setTimeout(() => {
      setUndoState(null);
    }, 5000);
  }

  async function handleConfirmDelivered(order: StoreOrder) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await confirmStoreOrderDeliveredWithUndo(order);

      if (result.order && result.snapshot) {
        showUndoBanner({
          label: 'Marked delivered',
          snapshot: result.snapshot,
        });
      }

      await loadDeliveries();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmMissed(order: StoreOrder) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await confirmStoreOrderMissedWithUndo(order);

      if (result.order && result.snapshot) {
        showUndoBanner({
          label: 'Marked missed',
          snapshot: result.snapshot,
        });
      }

      await loadDeliveries();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUndo() {
    if (!undoState || isSaving) {
      return;
    }

    setIsSaving(true);
    clearUndoTimer();
    const snapshot = undoState.snapshot;
    setUndoState(null);

    try {
      await undoStoreOrderConfirmation(snapshot);
      await loadDeliveries();
    } finally {
      setIsSaving(false);
    }
  }

  function handleNewEntryPress() {
    setPickerDate(new Date());
    setShowDatePicker(true);
  }

  async function finalizeNewEntry(selected: Date) {
    const expectedDeliveryDate = formatStoreOrderDateString(selected);
    const placedAt = formatStoreOrderDateString(new Date());
    const reference = new Date();
    const action = resolveStoreDeliveryNewEntryAction({
      reference,
      selectedDate: selected,
    });

    if (action.kind === 'reject_too_old') {
      Alert.alert(
        'Date out of range',
        `This screen supports delivery entries from the previous ${STORE_DELIVERIES_CONFIRMATION_LOOKBACK_DAYS} days.`,
      );
      return;
    }

    if (action.kind === 'create_scheduled') {
      setIsSaving(true);

      try {
        await createScheduledStoreDelivery({
          expectedDeliveryDate,
          placedAt,
          storeId,
        });
        await loadDeliveries();
      } finally {
        setIsSaving(false);
      }

      return;
    }

    Alert.alert('What happened?', undefined, [
        {
          text: 'Delivered',
          onPress: () => {
            void (async () => {
              setIsSaving(true);

              try {
                await createPastDeliveryWithOutcome({
                  expectedDeliveryDate,
                  placedAt,
                  storeId,
                  outcome: 'delivered',
                });
                await loadDeliveries();
              } finally {
                setIsSaving(false);
              }
            })();
          },
        },
        {
          text: 'Missed',
          onPress: () => {
            void (async () => {
              setIsSaving(true);

              try {
                await createPastDeliveryWithOutcome({
                  expectedDeliveryDate,
                  placedAt,
                  storeId,
                  outcome: 'missed',
                });
                await loadDeliveries();
              } finally {
                setIsSaving(false);
              }
            })();
          },
        },
        {
          text: 'Leave unconfirmed',
          onPress: () => {
            void (async () => {
              setIsSaving(true);

              try {
                await createPastDeliveryWithOutcome({
                  expectedDeliveryDate,
                  placedAt,
                  storeId,
                  outcome: 'unconfirmed',
                });
                await loadDeliveries();
              } finally {
                setIsSaving(false);
              }
            })();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
  }

  function handlePickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);

      if (event.type === 'dismissed' || !selected) {
        return;
      }

      void finalizeNewEntry(selected);
      return;
    }

    if (selected) {
      setPickerDate(selected);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            router.back();
          }}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={AppColors.blue} name="chevron-back" size={24} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.navTitleBlock}>
          <Text style={styles.navTitle}>Deliveries</Text>
          {storeTitle ? <Text style={styles.navSubtitle}>{storeTitle}</Text> : null}
        </View>
        <View style={styles.navSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={AppColors.blue} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + (undoState ? 72 : 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityLabel="New Entry"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={handleNewEntryPress}
            style={({ pressed }) => [styles.newEntryButton, pressed && styles.pressed]}
          >
            <Ionicons color="#FFFFFF" name="add" size={22} />
            <Text style={styles.newEntryText}>New Entry</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Needs Confirmation</Text>
          {needsConfirmation.length === 0 ? (
            <Text style={styles.emptyText}>No deliveries need confirmation</Text>
          ) : (
            needsConfirmation.map(({ order }) => (
              <View key={order.id} style={styles.queueCard}>
                <Text style={styles.queueDate}>
                  {formatStoreOrderDeliveryDate(order.expectedDeliveryDate)}
                </Text>
                <Text style={styles.queueSubtitle}>Scheduled delivery</Text>
                <View style={styles.queueActions}>
                  <Pressable
                    accessibilityLabel="Mark delivered"
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={() => {
                      void handleConfirmDelivered(order);
                    }}
                    style={({ pressed }) => [
                      styles.actionChip,
                      styles.deliveredChip,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons color={AppColors.green} name="checkmark" size={18} />
                    <Text style={styles.deliveredChipText}>Delivered</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Mark missed"
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={() => {
                      void handleConfirmMissed(order);
                    }}
                    style={({ pressed }) => [
                      styles.actionChip,
                      styles.missedChip,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons color={AppColors.orange} name="close" size={18} />
                    <Text style={styles.missedChipText}>Missed</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {upcoming.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {upcoming.map(({ order }) => (
                <View key={order.id} style={styles.upcomingRow}>
                  <Text style={styles.queueDate}>
                    {formatStoreOrderDeliveryDate(order.expectedDeliveryDate)}
                  </Text>
                  <Text style={styles.upcomingStatus}>Scheduled</Text>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      {undoState ? (
        <View style={[styles.undoBar, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.undoLabel}>{undoState.label}</Text>
          <Pressable
            accessibilityLabel="Undo delivery confirmation"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              void handleUndo();
            }}
            style={({ pressed }) => [styles.undoButton, pressed && styles.pressed]}
          >
            <Text style={styles.undoButtonText}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal animationType="slide" transparent visible={showDatePicker}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Select delivery date</Text>
              <View style={styles.modalCalendarShell}>
                <MileMateDatePicker
                  display="inline"
                  onChange={handlePickerChange}
                  value={pickerDate}
                />
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    setShowDatePicker(false);
                  }}
                  style={({ pressed }) => [styles.modalSecondary, pressed && styles.pressed]}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowDatePicker(false);
                    void finalizeNewEntry(pickerDate);
                  }}
                  style={({ pressed }) => [styles.modalPrimary, pressed && styles.pressed]}
                >
                  <Text style={styles.modalPrimaryText}>Continue</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : showDatePicker ? (
        <MileMateDatePicker
          display="calendar"
          onChange={handlePickerChange}
          value={pickerDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: MileMateTokens.background,
    flex: 1,
  },
  navBar: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 4,
  },
  backText: {
    color: AppColors.blue,
    fontSize: 17,
    fontWeight: '600',
  },
  navTitleBlock: {
    alignItems: 'center',
    flex: 1,
  },
  navTitle: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  navSubtitle: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  navSpacer: {
    width: 72,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  newEntryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  newEntryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyText: {
    color: AppColors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  queueCard: {
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 14,
  },
  queueDate: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  queueSubtitle: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  queueActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionChip: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
  },
  deliveredChip: {
    backgroundColor: `${AppColors.green}12`,
    borderColor: `${AppColors.green}44`,
  },
  deliveredChipText: {
    color: AppColors.green,
    fontSize: 15,
    fontWeight: '700',
  },
  missedChip: {
    backgroundColor: `${AppColors.orange}12`,
    borderColor: `${AppColors.orange}44`,
  },
  missedChipText: {
    color: AppColors.orange,
    fontSize: 15,
    fontWeight: '700',
  },
  upcomingRow: {
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  upcomingStatus: {
    color: AppColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  undoBar: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.backgroundElevated,
    borderTopColor: MileMateTokens.cardBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  undoLabel: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  undoButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  undoButtonText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: MileMateTokens.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 12,
    padding: 16,
    paddingBottom: 24,
  },
  modalTitle: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  modalCalendarShell: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalSecondary: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalSecondaryText: {
    color: AppColors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  modalPrimary: {
    backgroundColor: AppColors.blue,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
