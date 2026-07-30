import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WorkdayMoreSheet } from '@/components/navigation/workday-more-sheet';
import { AppColors } from '@/components/shared/app-theme';
import {
  WORKDAY_DOCK_CONTENT_HEIGHT,
  type WorkdayDockDestination,
} from '@/constants/workday-navigation-layout';
import { useWorkdayNavigation } from '@/contexts/workday-navigation-context';

type DockItem = {
  destination: WorkdayDockDestination | 'more';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const DOCK_ITEMS: DockItem[] = [
  { destination: 'current-stop', icon: 'navigate-circle', label: 'Current Stop' },
  { destination: 'route', icon: 'map-outline', label: 'Route' },
  { destination: 'visit-history', icon: 'time-outline', label: 'Visit History' },
  { destination: 'more', icon: 'ellipsis-horizontal-circle-outline', label: 'More' },
];

export function WorkdayDock() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    destination,
    requestScrollTo,
    setDestination,
    setLiveRouteViewMode,
  } = useWorkdayNavigation();
  const [showMore, setShowMore] = useState(false);

  const activeDestination = useMemo((): WorkdayDockDestination | 'more' => {
    if (pathname.includes('/visit-history')) {
      return 'visit-history';
    }

    return destination;
  }, [destination, pathname]);

  function handlePress(item: DockItem) {
    if (item.destination === 'more') {
      setShowMore(true);
      return;
    }

    setDestination(item.destination);

    if (item.destination === 'current-stop') {
      setLiveRouteViewMode('current-stop');
      router.navigate('/' as const);
      requestScrollTo('current-stop');
      return;
    }

    if (item.destination === 'route') {
      setLiveRouteViewMode('route');
      router.navigate('/' as const);
      requestScrollTo('route-map');
      return;
    }

    if (item.destination === 'visit-history') {
      router.navigate('/(tabs)/visit-history' as const);
    }
  }

  return (
    <>
      <View accessibilityRole="tablist" style={styles.container}>
        {DOCK_ITEMS.map((item) => {
          const isActive = activeDestination === item.destination;

          return (
            <Pressable
              key={item.label}
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                handlePress(item);
              }}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
            >
              <Ionicons
                color={isActive ? AppColors.blue : AppColors.textMuted}
                name={item.icon}
                size={22}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <WorkdayMoreSheet
        onClose={() => {
          setShowMore(false);
        }}
        visible={showMore}
      />
    </>
  );
}

export function workdayDockTotalHeight(safeAreaBottom: number): number {
  return WORKDAY_DOCK_CONTENT_HEIGHT + safeAreaBottom;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    height: WORKDAY_DOCK_CONTENT_HEIGHT,
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 4,
  },
  itemPressed: {
    opacity: 0.85,
  },
  label: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  labelActive: {
    color: AppColors.blue,
    fontWeight: '700',
  },
});
