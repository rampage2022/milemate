import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/components/shared/app-theme';
import { useWorkdayNavigation } from '@/contexts/workday-navigation-context';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import { devResetToHomePersistence } from '@/services/dev-reset-to-home';
import { notifyDevResetHome } from '@/utils/dev-reset-home-signal';
import { useRouteEditSession } from '@/contexts/route-edit-session-context';

export function DevResetHomeButton() {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return null;
  }

  return <DevResetHomeButtonInner />;
}

function DevResetHomeButtonInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isRouteEditMode } = useRouteEditSession();
  const { endWorkday } = useWorkdayTrackerContext();
  const { setPreWorkdayTabBarHidden } = useWorkdayNavigation();

  function handlePress() {
    Alert.alert(
      'Dev: Reset to home?',
      'Ends the active workday (if any), clears today\u2019s route from the UI, and opens the Home launcher.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await endWorkday();
                await devResetToHomePersistence();
                setPreWorkdayTabBarHidden(false);
                notifyDevResetHome();
                router.replace('/(tabs)' as const);
              } catch (error) {
                console.error('[DevResetHome] failed:', error);
                Alert.alert('Reset failed', 'See Metro/console logs for details.');
              }
            })();
          },
        },
      ],
    );
  }

  const hostStyle = isRouteEditMode
    ? {
        right: insets.right + 8,
        top: insets.top + 56,
      }
    : {
        left: insets.left + 8,
        top: insets.top + 8,
      };

  return (
    <View pointerEvents="box-none" style={[styles.host, hostStyle]}>
      <Pressable
        accessibilityLabel="Developer reset to home launcher"
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.label}>DEV · Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 9999,
  },
  button: {
    backgroundColor: 'rgba(220, 38, 38, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.9,
  },
});
