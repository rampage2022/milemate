import { Tabs, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { appShellStyles } from '@/components/redesign/layout/app-shell-styles';
import { AdaptiveTabBar } from '@/components/navigation/adaptive-tab-bar';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  AppColors,
  AppSpacing,
  AppTypography,
} from '@/components/shared/app-theme';
import { useWorkdayNavigation } from '@/contexts/workday-navigation-context';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import { shouldShowTabBarOnStoresDuringPreWorkday } from '@/utils/stores-map-navigation-intent';

export default function TabLayout() {
  const { mode, preWorkdayTabBarHidden } = useWorkdayNavigation();
  const { isRestoring } = useWorkdayTrackerContext();
  const pathname = usePathname();
  const showTabBarDuringPreWorkday = shouldShowTabBarOnStoresDuringPreWorkday({
    pathname,
    preWorkdayTabBarHidden,
  });

  const hideTabBarLayout =
    mode === 'completion' || isRestoring || (preWorkdayTabBarHidden && !showTabBarDuringPreWorkday);

  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
      return;
    }

    console.log('[Navigation] tab layout mounted');

    return () => {
      console.log('[Navigation] tab layout unmounted');
    };
  }, []);

  return (
    <View style={appShellStyles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: AppColors.blue,
          tabBarInactiveTintColor: AppColors.textSecondary,
          tabBarButton: HapticTab,
          tabBarHideOnKeyboard: true,
          tabBarIconStyle: styles.tabIcon,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarAllowFontScaling: true,
          sceneStyle: appShellStyles.stackContent,
          tabBarStyle: hideTabBarLayout
            ? {
                display: 'none',
                height: 0,
                ...(Platform.OS === 'android' ? { elevation: 0 } : null),
              }
            : {
                backgroundColor: AppColors.tabBar,
                borderTopColor: AppColors.tabBarBorder,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
        }}
        tabBar={(props) => <AdaptiveTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <IconSymbol color={color} name="house.fill" size={AppSpacing.tabBarIconSize} />
            ),
          }}
        />
        <Tabs.Screen
          name="stores"
          options={{
            title: 'Stores',
            tabBarIcon: ({ color }) => (
              <IconSymbol color={color} name="building.2.fill" size={AppSpacing.tabBarIconSize} />
            ),
          }}
        />
        <Tabs.Screen
          name="visit-history"
          options={{
            title: 'Visits',
            tabBarIcon: ({ color }) => (
              <IconSymbol
                color={color}
                name="list.bullet.clipboard.fill"
                size={AppSpacing.tabBarIconSize}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color }) => (
              <IconSymbol color={color} name="chart.bar.fill" size={AppSpacing.tabBarIconSize} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            title: 'Settings',
            tabBarIcon: ({ color }) => (
              <IconSymbol color={color} name="gearshape.fill" size={AppSpacing.tabBarIconSize} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    marginBottom: 0,
  },
  tabItem: {
    minHeight: AppSpacing.minTouchTarget,
    paddingVertical: 4,
  },
  tabLabel: {
    ...AppTypography.tabLabel,
    marginTop: 4,
  },
});
