import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { RouteDeliveryDetailSheet } from '@/components/route/route-delivery-detail-sheet';
import { RouteDeliveryStatusChip } from '@/components/route/route-delivery-status-chip';
import { formatDurationDisplay } from '@/components/home/format-workday';
import { AppColors } from '@/components/shared/app-theme';
import { useVisitElapsedMs } from '@/hooks/use-visit-elapsed-ms';
import {
  formatTravelEstimate,
  type StoreArrivalSnapshot,
} from '@/services/store-arrival';
import type { AutoCheckInMode } from '@/types/auto-check-in';
import type { ArrivalSessionStatus } from '@/types/arrival-session';
import type { RouteDeliveryChipModel } from '@/utils/route-store-delivery-signal';
import type { RouteStoreCardViewModel } from '@/utils/route-store-card-model';
import {
  getStopDisplayStatusLabel,
  type StopDisplayStatus,
} from '@/utils/stop-display-status';
import {
  resolveCurrentStopPhase,
  type CurrentStopPhase,
} from '@/utils/current-stop-phase';
import { shouldShowManualCheckInButton } from '@/components/stops/current-stop-card-logic';
import type { Store } from '@/types/store';
import { openStoreDirectionsSafely } from '@/utils/store-navigation';

import { stopCardSharedStyles } from '@/components/stops/stop-card-shared';

type CurrentStopCardProps = {
  store: Store;
  viewModel: RouteStoreCardViewModel;
  activeDisplayStatus: StopDisplayStatus;
  arrival: StoreArrivalSnapshot;
  arrivalStatus: ArrivalSessionStatus;
  autoCheckInMode: AutoCheckInMode;
  delivery?: RouteDeliveryChipModel | null;
  isActionPending?: boolean;
  isAutomaticCheckInPending: boolean;
  isCompletionActive?: boolean;
  isMapHighlighted?: boolean;
  onCheckIn: () => void;
  onCompleteVisit: () => void;
  onOpenStore: () => void;
  onUndoCheckIn?: () => void;
  showAskPrompt: boolean;
  visitCheckedInAt?: number;
  visitStatus: 'pending' | 'current' | 'checked_in' | 'completed' | 'skipped';
};

function StatusMetaRow({
  activeDisplayStatus,
  travelLabel,
}: {
  activeDisplayStatus: StopDisplayStatus;
  travelLabel: string | null;
}) {
  const statusLabel = getStopDisplayStatusLabel(activeDisplayStatus);

  if (!statusLabel && !travelLabel) {
    return null;
  }

  return (
    <View style={styles.metaRow}>
      {statusLabel ? (
        <>
          <Ionicons
            color={
              activeDisplayStatus === 'checked_in'
                ? AppColors.green
                : activeDisplayStatus === 'en_route'
                  ? AppColors.blue
                  : '#0F766E'
            }
            name={
              activeDisplayStatus === 'checked_in'
                ? 'checkmark-circle'
                : 'car-outline'
            }
            size={16}
          />
          <Text
            style={[
              styles.metaStatus,
              activeDisplayStatus === 'en_route' && styles.metaEnRoute,
              activeDisplayStatus === 'checked_in' && styles.metaCheckedIn,
              activeDisplayStatus === 'arriving' && styles.metaArriving,
            ]}
          >
            {statusLabel}
          </Text>
        </>
      ) : null}
      {statusLabel && travelLabel ? (
        <View style={styles.metaDivider} />
      ) : null}
      {travelLabel ? (
        <Text style={styles.metaTravel}>{travelLabel}</Text>
      ) : null}
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  variant,
}: {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'complete';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'primary' && styles.actionPrimary,
        variant === 'complete' && styles.actionComplete,
        variant === 'secondary' && styles.actionSecondary,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.actionPressed,
      ]}
    >
      <Ionicons
        color={
          variant === 'secondary' ? AppColors.blue : '#FFFFFF'
        }
        name={icon}
        size={18}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.actionLabel,
          variant === 'secondary' && styles.actionLabelSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PhaseHintBanner({
  arrivalStatus,
  autoCheckInMode,
  isAutomaticCheckInPending,
  isVisitCompleted,
  phase,
  showAskPrompt,
  storeName,
}: {
  arrivalStatus: ArrivalSessionStatus;
  autoCheckInMode: AutoCheckInMode;
  isAutomaticCheckInPending: boolean;
  isVisitCompleted: boolean;
  phase: CurrentStopPhase;
  showAskPrompt: boolean;
  storeName: string;
}) {
  if (isVisitCompleted) {
    return null;
  }

  if (isAutomaticCheckInPending) {
    return (
      <Text style={styles.hintConfirming}>Checking you in…</Text>
    );
  }

  if (showAskPrompt) {
    return (
      <Text style={styles.hintArrived}>
        You&apos;ve arrived at {storeName}. Use Check In when ready.
      </Text>
    );
  }

  if (arrivalStatus === 'candidate' || arrivalStatus === 'dwelling') {
    return (
      <Text style={styles.hintConfirming}>
        Confirming arrival… Nearby · checking location
      </Text>
    );
  }

  if (phase === 'arrived' && autoCheckInMode === 'manual') {
    return (
      <Text style={styles.hintArrived}>You&apos;ve arrived. Use Check In when ready.</Text>
    );
  }

  return null;
}

export function CurrentStopCard({
  activeDisplayStatus,
  arrival,
  arrivalStatus,
  autoCheckInMode,
  delivery,
  isActionPending = false,
  isAutomaticCheckInPending,
  isCompletionActive = false,
  isMapHighlighted = false,
  onCheckIn,
  onCompleteVisit,
  onOpenStore,
  onUndoCheckIn,
  showAskPrompt,
  store,
  viewModel,
  visitCheckedInAt,
  visitStatus,
}: CurrentStopCardProps) {
  const [deliverySheetOpen, setDeliverySheetOpen] = useState(false);
  const phase = resolveCurrentStopPhase(visitStatus, arrival.hasArrived);
  const isVisitCompleted = visitStatus === 'completed';
  const elapsedMs = useVisitElapsedMs(
    visitStatus === 'checked_in' ? visitCheckedInAt : undefined,
  );
  const visitElapsedLabel =
    elapsedMs !== null ? formatDurationDisplay(elapsedMs).value : null;
  const travelLabel = formatTravelEstimate(arrival);
  const actionsDisabled =
    isActionPending || isAutomaticCheckInPending || isCompletionActive;

  const canComplete =
    visitStatus === 'current' || visitStatus === 'checked_in';

  const showCheckInButton = shouldShowManualCheckInButton({
    autoCheckInMode,
    isAutomaticCheckInPending,
    phase,
    showAskPrompt,
    visitStatus,
  });

  const centerAction: ReactNode = (() => {
    if (isVisitCompleted) {
      return (
        <ActionButton
          icon="document-text-outline"
          label="Visit Log"
          onPress={onOpenStore}
          variant="primary"
        />
      );
    }

    if (canComplete && visitStatus === 'checked_in') {
      return (
        <ActionButton
          disabled={actionsDisabled}
          icon="checkmark-done"
          label="Complete Visit"
          onPress={onCompleteVisit}
          variant="complete"
        />
      );
    }

    if (showCheckInButton) {
      return (
        <ActionButton
          disabled={actionsDisabled || isAutomaticCheckInPending}
          icon="checkmark"
          label={isAutomaticCheckInPending ? 'Checking…' : 'Check In'}
          onPress={onCheckIn}
          variant="primary"
        />
      );
    }

    return (
      <ActionButton
        disabled
        icon="checkmark"
        label="Check In"
        onPress={() => {}}
        variant="primary"
      />
    );
  })();

  return (
    <>
      <View
        style={[
          stopCardSharedStyles.card,
          stopCardSharedStyles.leftAccent,
          styles.cardCurrent,
          { borderLeftColor: AppColors.blue },
          isMapHighlighted && styles.cardHighlighted,
        ]}
      >
        <View style={styles.cardInner}>
          <View style={styles.headerRow}>
            <View style={styles.stopBadge}>
              <Text style={styles.stopBadgeText}>{viewModel.stopNumber}</Text>
            </View>
            <View style={styles.headerCopy}>
              <View style={styles.currentLabelRow}>
                <Text style={styles.currentLabel}>Current Stop</Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel={`Open ${viewModel.storeName}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenStore}
              style={({ pressed }) => [pressed && styles.chevronPressed]}
            >
              <Ionicons color={AppColors.textMuted} name="chevron-forward" size={22} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onOpenStore}
            style={({ pressed }) => [styles.storePressable, pressed && styles.storePressed]}
          >
            <Text style={styles.storeName}>{viewModel.storeName}</Text>
            <View style={styles.addressRow}>
              <Ionicons color={AppColors.textMuted} name="location-outline" size={16} />
              <Text style={styles.address}>{viewModel.address}</Text>
            </View>
          </Pressable>

          <StatusMetaRow
            activeDisplayStatus={activeDisplayStatus}
            travelLabel={travelLabel}
          />

          {visitElapsedLabel ? (
            <Text style={styles.visitTimer}>Visit time {visitElapsedLabel}</Text>
          ) : null}

          {visitStatus === 'checked_in' && onUndoCheckIn ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onUndoCheckIn}
              style={({ pressed }) => [pressed && styles.undoPressed]}
            >
              <Text style={styles.undoLink}>Undo check-in</Text>
            </Pressable>
          ) : null}

          <PhaseHintBanner
            arrivalStatus={arrivalStatus}
            autoCheckInMode={autoCheckInMode}
            isAutomaticCheckInPending={isAutomaticCheckInPending}
            isVisitCompleted={isVisitCompleted}
            phase={phase}
            showAskPrompt={showAskPrompt}
            storeName={viewModel.storeName}
          />

          {delivery ? (
            <Pressable
              accessibilityLabel={delivery.statusLabel}
              accessibilityRole={delivery.hasInteractiveDetails ? 'button' : 'text'}
              disabled={!delivery.hasInteractiveDetails}
              onPress={() => {
                setDeliverySheetOpen(true);
              }}
            >
              <RouteDeliveryStatusChip
                interactive={false}
                label={delivery.statusLabel}
                status={delivery.status}
              />
            </Pressable>
          ) : null}

          <View style={styles.actionsRow}>
            <View style={styles.actionSide}>
              <ActionButton
                disabled={actionsDisabled}
                icon="navigate-outline"
                label="Directions"
                onPress={() => {
                  openStoreDirectionsSafely(store);
                }}
                variant="secondary"
              />
            </View>
            <View style={styles.actionCenter}>{centerAction}</View>
            <View style={styles.actionSide}>
              <ActionButton
                icon="document-text-outline"
                label="Visit Log"
                onPress={onOpenStore}
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </View>

      {delivery ? (
        <RouteDeliveryDetailSheet
          deliveryStatus={delivery.status}
          details={delivery.details}
          onClose={() => {
            setDeliverySheetOpen(false);
          }}
          storeName={viewModel.storeName}
          visible={deliverySheetOpen}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  cardCurrent: {
    backgroundColor: '#FFFFFF',
  },
  cardHighlighted: {
    borderColor: AppColors.blue,
    borderWidth: 2,
  },
  cardInner: {
    gap: 12,
    paddingHorizontal: PlanningLayout.cardPaddingH,
    paddingVertical: 18,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stopBadge: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stopBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerCopy: {
    flex: 1,
  },
  currentLabelRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentLabel: {
    color: AppColors.blue,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chevronPressed: {
    opacity: 0.7,
  },
  storePressable: {
    gap: 8,
  },
  storePressed: {
    opacity: 0.92,
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  addressRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  address: {
    color: AppColors.textSecondary,
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaStatus: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaEnRoute: {
    color: AppColors.blue,
  },
  metaArriving: {
    color: '#0F766E',
  },
  metaCheckedIn: {
    color: AppColors.green,
  },
  metaTravel: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  metaDivider: {
    backgroundColor: AppColors.border,
    height: 14,
    width: 1,
  },
  visitTimer: {
    color: AppColors.green,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  hintConfirming: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
  },
  hintArrived: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionsRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionSide: {
    flex: 1,
    minWidth: 0,
  },
  actionCenter: {
    flex: 1.25,
    minWidth: 0,
  },
  actionButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 14,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  actionPrimary: {
    backgroundColor: AppColors.blue,
  },
  actionComplete: {
    backgroundColor: AppColors.green,
  },
  actionSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.blue,
    borderWidth: 1.5,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionLabelSecondary: {
    color: AppColors.blue,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionPressed: {
    opacity: 0.88,
  },
  undoLink: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  undoPressed: {
    opacity: 0.75,
  },
});
