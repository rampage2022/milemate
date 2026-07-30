import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { formatDurationDisplay } from '@/components/home/format-workday';
import { RouteStoreCard } from '@/components/route/route-store-card';
import { useSwipeRowPressBlocked, useSwipeRowPressGuard } from '@/components/shared/swipe-action-row';
import { useVisitElapsedMs } from '@/hooks/use-visit-elapsed-ms';
import { AppColors } from '@/components/shared/app-theme';
import type { StoreVisit } from '@/types/store-visit';
import type { LiveStopPresentationState } from '@/utils/live-route-summary';
import type { RouteStoreCardViewModel } from '@/utils/route-store-card-model';
import type { StopDisplayStatus } from '@/utils/stop-display-status';
import { getStopDisplayStatusLabel } from '@/utils/stop-display-status';

type LiveStopCardProps = {
  activeDisplayStatus: StopDisplayStatus;
  canUndoCheckIn?: boolean;
  delayLongPress?: number;
  isMapHighlighted?: boolean;
  omitBottomSpacing?: boolean;
  onLongPress?: () => void;
  onPress: () => void;
  onUndoCheckIn?: () => void;
  pressDisabled?: boolean;
  state: LiveStopPresentationState;
  viewModel: RouteStoreCardViewModel;
  visit: StoreVisit;
};

function ActiveStatusFooter({
  activeDisplayStatus,
  canUndoCheckIn,
  onUndoCheckIn,
  state,
  visitElapsedLabel,
}: {
  activeDisplayStatus: StopDisplayStatus;
  canUndoCheckIn?: boolean;
  onUndoCheckIn?: () => void;
  state: LiveStopPresentationState;
  visitElapsedLabel: string | null;
}) {
  if (state !== 'current') {
    return null;
  }

  const label = getStopDisplayStatusLabel(activeDisplayStatus);

  if (!label && !visitElapsedLabel && !(canUndoCheckIn && onUndoCheckIn)) {
    return null;
  }

  return (
    <View style={styles.activeFooter}>
      {label ? (
        <View style={styles.activeStatusRow}>
          {activeDisplayStatus === 'checked_in' ? (
            <Ionicons color={AppColors.green} name="checkmark-circle" size={16} />
          ) : null}
          <Text
            style={[
              styles.activeStatusLabel,
              activeDisplayStatus === 'arriving' && styles.arrivingLabel,
              activeDisplayStatus === 'checked_in' && styles.checkedInLabel,
              activeDisplayStatus === 'en_route' && styles.enRouteLabel,
            ]}
          >
            {label}
          </Text>
        </View>
      ) : null}
      {visitElapsedLabel ? (
        <Text style={styles.visitElapsed}>{visitElapsedLabel}</Text>
      ) : null}
      {canUndoCheckIn && onUndoCheckIn ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onUndoCheckIn}
          style={({ pressed }) => [pressed && styles.undoPressed]}
        >
          <Text style={styles.undoLink}>Undo check-in</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LiveStopCard({
  activeDisplayStatus,
  canUndoCheckIn = false,
  delayLongPress,
  isMapHighlighted = false,
  omitBottomSpacing = false,
  onLongPress,
  onPress,
  onUndoCheckIn,
  pressDisabled = false,
  state,
  viewModel,
  visit,
}: LiveStopCardProps) {
  const shouldAllowCardPress = useSwipeRowPressGuard();
  const isSwipePressBlocked = useSwipeRowPressBlocked();
  const checkedInFade = useRef(new Animated.Value(1)).current;
  const previousCheckedInRef = useRef(activeDisplayStatus === 'checked_in');
  const elapsedMs = useVisitElapsedMs(
    activeDisplayStatus === 'checked_in' ? visit.checkedInAt : undefined,
  );
  const visitElapsedLabel =
    elapsedMs !== null ? formatDurationDisplay(elapsedMs).value : null;

  useEffect(() => {
    const isCheckedIn = activeDisplayStatus === 'checked_in';

    if (isCheckedIn && !previousCheckedInRef.current) {
      checkedInFade.setValue(0.35);
      Animated.timing(checkedInFade, {
        duration: 280,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }

    previousCheckedInRef.current = isCheckedIn;
  }, [activeDisplayStatus, checkedInFade]);

  const accessibilityLabel = `${viewModel.storeName}, stop ${viewModel.stopNumber}, ${state}`;

  const activeFooter = (
    <Animated.View style={{ opacity: checkedInFade }}>
      <ActiveStatusFooter
        activeDisplayStatus={activeDisplayStatus}
        canUndoCheckIn={canUndoCheckIn}
        onUndoCheckIn={onUndoCheckIn}
        state={state}
        visitElapsedLabel={visitElapsedLabel}
      />
    </Animated.View>
  ) as ReactNode;

  return (
    <RouteStoreCard
      accessibilityLabel={accessibilityLabel}
      activeStatusFooter={activeFooter}
      delayLongPress={delayLongPress}
      isMapHighlighted={isMapHighlighted}
      omitBottomSpacing={omitBottomSpacing}
      onLongPress={onLongPress}
      onPress={() => {
        if (!shouldAllowCardPress()) {
          return;
        }

        onPress();
      }}
      pressDisabled={pressDisabled || isSwipePressBlocked}
      viewModel={viewModel}
    />
  );
}

export { getLiveStopCompletionTimeLabel } from '@/components/coordinator/live-stop-card-helpers';

const styles = StyleSheet.create({
  activeFooter: {
    gap: 4,
    paddingTop: 2,
  },
  activeStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  activeStatusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  enRouteLabel: {
    color: AppColors.blue,
  },
  arrivingLabel: {
    color: '#0F766E',
  },
  checkedInLabel: {
    color: AppColors.green,
  },
  visitElapsed: {
    color: AppColors.green,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
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
