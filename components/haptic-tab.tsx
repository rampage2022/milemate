import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';

export function HapticTab(props: BottomTabBarButtonProps) {
  const selected = props.accessibilityState?.selected;

  return (
    <View style={styles.item}>
      <View style={styles.indicatorTrack}>
        {selected ? <View style={styles.indicator} accessibilityElementsHidden /> : null}
      </View>
      <PlatformPressable
        {...props}
        style={[props.style, styles.pressable]}
        onPressIn={(ev) => {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          props.onPressIn?.(ev);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    minHeight: AppSpacing.minTouchTarget,
  },
  indicatorTrack: {
    alignItems: 'center',
    height: 3,
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  indicator: {
    backgroundColor: AppColors.tabBarActiveIndicator,
    borderRadius: 2,
    height: 3,
    width: AppSpacing.tabBarIndicatorWidth,
  },
  pressable: {
    flex: 1,
    minHeight: AppSpacing.minTouchTarget - 5,
  },
});
