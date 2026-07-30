import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { StandardTabBar } from '@/components/navigation/standard-tab-bar';
import { useWorkdayNavigation } from '@/contexts/workday-navigation-context';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';

/**
 * Pre-workday and active workday: standard bottom tabs (mock 5).
 * Completion / focused flows: hide chrome.
 */
export function AdaptiveTabBar(props: BottomTabBarProps) {
  const { mode, preWorkdayTabBarHidden } = useWorkdayNavigation();
  const { isRestoring } = useWorkdayTrackerContext();

  if (isRestoring) {
    return null;
  }

  if (mode === 'completion' || preWorkdayTabBarHidden) {
    return null;
  }

  return <StandardTabBar {...props} />;
}
