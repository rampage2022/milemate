import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { appShellStyles } from '@/components/redesign/layout/app-shell-styles';
import { CheckInNotificationNavigation } from '@/components/notifications/check-in-notification-navigation';
import { DevResetHomeButton } from '@/components/dev/dev-reset-home-button';
import { AppShell } from '@/components/shared/app-theme';
import { MileMateNavigationTheme } from '@/constants/milemate-navigation-theme';
import { RouteEditSessionProvider } from '@/contexts/route-edit-session-context';
import { VisitAdvancementProvider } from '@/contexts/visit-advancement-context';
import { WorkdayNavigationProvider } from '@/contexts/workday-navigation-context';
import { ArrivalCheckInProvider } from '@/contexts/arrival-check-in-context';
import { WorkdayTrackerProvider } from '@/contexts/workday-tracker-context';
import {
  ENABLE_GESTURE_DEBUG_UI,
  GestureDebugOverlay,
} from '@/hooks/use-gesture-interaction-cleanup';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
      return;
    }

    console.log('[Navigation] root layout mounted');

    return () => {
      console.log('[Navigation] root layout unmounted');
    };
  }, []);

  return (
    <GestureHandlerRootView style={appShellStyles.root}>
      <WorkdayTrackerProvider>
        <VisitAdvancementProvider>
          <RouteEditSessionProvider>
          <WorkdayNavigationProvider>
            <ArrivalCheckInProvider>
            <ThemeProvider value={MileMateNavigationTheme}>
              <CheckInNotificationNavigation />
              <Stack
                screenOptions={{
                  contentStyle: appShellStyles.stackContent,
                  headerStyle: { backgroundColor: MileMateNavigationTheme.colors.card },
                  headerTintColor: MileMateNavigationTheme.colors.text,
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="profile"
                  options={{ headerShown: false, title: 'Profile' }}
                />
                <Stack.Screen
                  name="diagnostics"
                  options={{ headerShown: false, title: 'GPS Diagnostics' }}
                />
                <Stack.Screen
                  name="store/[storeId]"
                  options={{ headerShown: false, title: 'Store' }}
                />
                <Stack.Screen
                  name="store-import/index"
                  options={{ headerShown: false, title: 'Import Stores' }}
                />
                <Stack.Screen
                  name="order-storage-diagnostic"
                  options={{ headerShown: false, title: 'Order Storage Diagnostic' }}
                />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              {ENABLE_GESTURE_DEBUG_UI ? <GestureDebugOverlay /> : null}
              <DevResetHomeButton />
              <StatusBar style={AppShell.statusBarStyle} />
            </ThemeProvider>
            </ArrivalCheckInProvider>
          </WorkdayNavigationProvider>
          </RouteEditSessionProvider>
        </VisitAdvancementProvider>
      </WorkdayTrackerProvider>
    </GestureHandlerRootView>
  );
}
