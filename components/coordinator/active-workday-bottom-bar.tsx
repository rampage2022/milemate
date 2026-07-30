import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, MileMateTokens } from '@/components/shared/app-theme';

export const ACTIVE_WORKDAY_BOTTOM_BAR_HEIGHT = 76;

/** Bar min height plus top padding in `ActiveWorkdayBottomBar`. */
export const ACTIVE_WORKDAY_BOTTOM_BAR_CONTENT_HEIGHT =
  ACTIVE_WORKDAY_BOTTOM_BAR_HEIGHT + 10;

export function activeWorkdayBottomScrollInset(input: {
  safeAreaBottom: number;
  tabBarVisible: boolean;
  tabBarContentHeight: number;
}): number {
  const chromeHeight = ACTIVE_WORKDAY_BOTTOM_BAR_CONTENT_HEIGHT + 16;

  if (input.tabBarVisible) {
    return chromeHeight;
  }

  return chromeHeight + input.safeAreaBottom;
}

export function activeWorkdayActionBarBottomPadding(input: {
  safeAreaBottom: number;
  tabBarVisible: boolean;
}): number {
  return input.tabBarVisible ? 0 : input.safeAreaBottom;
}

type ActiveWorkdayBottomBarProps = {
  bottomInset: number;
  onAddStops: () => void;
  onEnterRouteEdit: () => void;
  onSkipCurrentStop: () => void;
};

export function ActiveWorkdayBottomBar({
  bottomInset,
  onAddStops,
  onEnterRouteEdit,
  onSkipCurrentStop,
}: ActiveWorkdayBottomBarProps) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomInset }]}
    >
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          onPress={onEnterRouteEdit}
          style={({ pressed }) => [styles.side, pressed && styles.pressed]}
        >
          <Ionicons color={AppColors.blue} name="swap-vertical" size={20} />
          <Text style={styles.sideLabel}>Reorder Stops</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onAddStops}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <Ionicons color="#FFFFFF" name="add" size={28} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onSkipCurrentStop}
          style={({ pressed }) => [styles.side, pressed && styles.pressed]}
        >
          <Ionicons color={AppColors.orange} name="refresh" size={20} />
          <Text style={styles.sideLabel}>Skip Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: MileMateTokens.background,
    borderTopColor: MileMateTokens.cardBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bar: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: ACTIVE_WORKDAY_BOTTOM_BAR_HEIGHT,
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  side: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
  },
  sideLabel: {
    color: AppColors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 32,
    height: 56,
    justifyContent: 'center',
    marginBottom: 4,
    width: 56,
  },
  pressed: {
    opacity: 0.88,
  },
});
