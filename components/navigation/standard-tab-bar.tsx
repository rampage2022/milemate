import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';

/** Pre-workday tab bar: Home, Stores, Stats (redesign shell). */
export function StandardTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <BottomTabBar
      {...props}
      style={[
        styles.bar,
        {
          height: AppSpacing.tabBarContentHeight + bottomInset,
          paddingBottom: bottomInset + (Platform.OS === 'ios' ? 2 : 4),
          paddingTop: 8,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: AppColors.tabBar,
    borderTopColor: AppColors.tabBarBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
});
