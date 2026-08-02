import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePathname } from 'expo-router';

import { StandardTabBar } from '@/components/navigation/standard-tab-bar';
import { useWorkdayNavigation } from '@/contexts/workday-navigation-context';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import { shouldShowTabBarOnStoresDuringPreWorkday } from '@/utils/stores-map-navigation-intent';

/**
 * Pre-workday and active workday: standard bottom tabs (mock 5).
 * Completion / focused flows: hide chrome.
 */
export function AdaptiveTabBar(props: BottomTabBarProps) {
  const { mode, preWorkdayTabBarHidden } = useWorkdayNavigation();
  const { isRestoring } = useWorkdayTrackerContext();
  const pathname = usePathname();
  const showTabBarDuringPreWorkday = shouldShowTabBarOnStoresDuringPreWorkday({
    pathname,
    preWorkdayTabBarHidden,
  });

  if (isRestoring) {
    return null;
  }

  if (mode === 'completion' || (preWorkdayTabBarHidden && !showTabBarDuringPreWorkday)) {
    return null;
  }

  return <StandardTabBar {...props} />;
}
