import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import type { TodayRouteStore } from '@/hooks/use-today-route';
import {
  formatTravelEstimate,
  type StoreArrivalSnapshot,
} from '@/services/store-arrival';
import { formatStoreAddress } from '@/types/store';
import type { ArrivalSessionStatus } from '@/types/arrival-session';
import type { AutoCheckInMode } from '@/types/auto-check-in';
import { openStoreDirectionsSafely } from '@/utils/store-navigation';
import {
  resolveCurrentStopPhase,
  type CurrentStopPhase,
} from '@/utils/current-stop-phase';

type CurrentStopCardProps = {
  stop: TodayRouteStore;
  stopIndex: number;
  totalStops: number;
  arrival: StoreArrivalSnapshot;
  arrivalStatus: ArrivalSessionStatus;
  autoCheckInMode: AutoCheckInMode;
  showAskPrompt: boolean;
  isAutomaticCheckInPending: boolean;
  isActionPending?: boolean;
  isVisitCompleted?: boolean;
  onCheckIn: () => void;
  onOpenStore: () => void;
  onCompleteVisit: () => void;
};

function PhaseBanner({
  arrivalStatus,
  autoCheckInMode,
  isAutomaticCheckInPending,
  isVisitCompleted,
  phase,
  showAskPrompt,
  storeName,
  visitCheckedIn,
}: {
  arrivalStatus: ArrivalSessionStatus;
  autoCheckInMode: AutoCheckInMode;
  isAutomaticCheckInPending: boolean;
  isVisitCompleted?: boolean;
  phase: CurrentStopPhase;
  showAskPrompt: boolean;
  storeName: string;
  visitCheckedIn: boolean;
}) {
  if (isVisitCompleted) {
    return (
      <View style={styles.completedBanner}>
        <Text style={styles.completedBannerText}>✓ Visit complete</Text>
      </View>
    );
  }

  if (isAutomaticCheckInPending) {
    return (
      <View style={styles.confirmingBanner}>
        <Text style={styles.confirmingBannerText}>Checking you in…</Text>
      </View>
    );
  }

  if (phase === 'visit_in_progress') {
    return <AnimatedCheckedInBanner visible={visitCheckedIn} />;
  }

  if (showAskPrompt) {
    return (
      <View style={styles.arrivedBanner}>
        <Text style={styles.arrivedBannerText}>You&apos;ve arrived</Text>
        <Text style={styles.arrivedPromptText}>
          Check in at {storeName}?
        </Text>
      </View>
    );
  }

  if (
    arrivalStatus === 'candidate' ||
    arrivalStatus === 'dwelling'
  ) {
    return (
      <View style={styles.confirmingBanner}>
        <Text style={styles.confirmingBannerText}>Confirming arrival…</Text>
        <Text style={styles.confirmingHintText}>Nearby · checking location</Text>
      </View>
    );
  }

  if (phase === 'arrived') {
    return (
      <View style={styles.arrivedBanner}>
        <Text style={styles.arrivedBannerText}>You&apos;ve arrived</Text>
        {autoCheckInMode === 'manual' ? (
          <Text style={styles.arrivedPromptText}>Use Check In when ready.</Text>
        ) : null}
      </View>
    );
  }

  return null;
}

function AnimatedCheckedInBanner({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    opacity.setValue(0.35);
    Animated.timing(opacity, {
      duration: 280,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);

  if (!visible) {
    return (
      <View style={styles.inProgressBanner}>
        <Text style={styles.inProgressBannerText}>Visit in progress</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.checkedInBanner, { opacity }]}>
      <View style={styles.checkedInTitleRow}>
        <Ionicons color={AppColors.green} name="checkmark-circle" size={18} />
        <Text style={styles.checkedInBannerText}>Checked In</Text>
      </View>
    </Animated.View>
  );
}

function TravelEstimate({ arrival }: { arrival: StoreArrivalSnapshot }) {
  const label = formatTravelEstimate(arrival);

  if (!label) {
    return null;
  }

  return <Text style={styles.travelEstimate}>{label}</Text>;
}

function PrimaryButton({
  disabled,
  label,
  onPress,
  variant = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'complete';
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        variant === 'complete' && styles.completeButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function CurrentStopCard({
  arrival,
  arrivalStatus,
  autoCheckInMode,
  isActionPending,
  isAutomaticCheckInPending,
  isVisitCompleted,
  onCheckIn,
  onCompleteVisit,
  onOpenStore,
  showAskPrompt,
  stop,
  stopIndex,
  totalStops,
}: CurrentStopCardProps) {
  const { store, visit } = stop;
  const phase = resolveCurrentStopPhase(visit.status, arrival.hasArrived);
  const actionsDisabled = isActionPending || isAutomaticCheckInPending;

  const handleNavigate = () => {
    openStoreDirectionsSafely(store);
  };

  const renderActions = () => {
    if (isVisitCompleted) {
      return (
        <PrimaryButton
          disabled={actionsDisabled}
          label="Open Store"
          onPress={onOpenStore}
        />
      );
    }

    if (phase === 'visit_in_progress') {
      return (
        <View style={styles.actionsColumn}>
          <PrimaryButton
            disabled={actionsDisabled}
            label="Complete Visit"
            onPress={onCompleteVisit}
            variant="complete"
          />
          <SecondaryButton
            disabled={actionsDisabled}
            label="Open Store"
            onPress={onOpenStore}
          />
        </View>
      );
    }

    if (showAskPrompt) {
      return (
        <View style={styles.actionsColumn}>
          <PrimaryButton
            disabled={actionsDisabled}
            label="Check In"
            onPress={onCheckIn}
          />
          <SecondaryButton
            disabled={actionsDisabled}
            label="Open Store"
            onPress={onOpenStore}
          />
        </View>
      );
    }

    if (isAutomaticCheckInPending) {
      return (
        <View style={styles.actionsColumn}>
          <PrimaryButton disabled label="Checking you in…" onPress={() => {}} />
        </View>
      );
    }

    if (phase === 'arrived') {
      if (autoCheckInMode === 'manual') {
        return (
          <View style={styles.actionsColumn}>
            <PrimaryButton
              disabled={actionsDisabled}
              label="Check In"
              onPress={onCheckIn}
            />
            <SecondaryButton
              disabled={actionsDisabled}
              label="Open Store"
              onPress={onOpenStore}
            />
          </View>
        );
      }

      return (
        <View style={styles.actionsColumn}>
          <PrimaryButton
            disabled={actionsDisabled}
            label="Open Store"
            onPress={onOpenStore}
          />
          <SecondaryButton
            disabled={actionsDisabled}
            label="Navigate"
            onPress={handleNavigate}
          />
        </View>
      );
    }

    return (
      <View style={styles.actionsColumn}>
        <PrimaryButton
          disabled={actionsDisabled}
          label="Navigate"
          onPress={handleNavigate}
        />
        <SecondaryButton
          disabled={actionsDisabled}
          label="Open Store"
          onPress={onOpenStore}
        />
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Current Stop</Text>
      <Text style={styles.stopNumber}>
        Stop {stopIndex} of {totalStops}
      </Text>
      <Text style={styles.storeName}>{store.name}</Text>
      <Text style={styles.address}>{formatStoreAddress(store)}</Text>

      {!isVisitCompleted && phase === 'not_arrived' ? (
        <TravelEstimate arrival={arrival} />
      ) : null}
      <PhaseBanner
        arrivalStatus={arrivalStatus}
        autoCheckInMode={autoCheckInMode}
        isAutomaticCheckInPending={isAutomaticCheckInPending}
        isVisitCompleted={isVisitCompleted}
        phase={phase}
        showAskPrompt={showAskPrompt}
        storeName={store.name}
        visitCheckedIn={visit.status === 'checked_in'}
      />
      {renderActions()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.blue,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 2,
    gap: 10,
    padding: 20,
  },
  eyebrow: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  stopNumber: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  travelEstimate: {
    color: AppColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  completedBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  completedBannerText: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '700',
  },
  arrivedBanner: {
    backgroundColor: AppColors.greenSoft,
    borderRadius: 12,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  arrivedBannerText: {
    color: AppColors.green,
    fontSize: 15,
    fontWeight: '700',
  },
  arrivedPromptText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmingBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  confirmingBannerText: {
    color: '#92400E',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmingHintText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '600',
  },
  inProgressBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inProgressBannerText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
  checkedInBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  checkedInTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  checkedInBannerText: {
    color: AppColors.green,
    fontSize: 15,
    fontWeight: '700',
  },
  actionsColumn: {
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.startButton,
    borderRadius: AppSpacing.buttonRadius,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    width: '100%',
  },
  completeButton: {
    backgroundColor: AppColors.green,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: AppSpacing.buttonRadius,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    width: '100%',
  },
  secondaryButtonText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
