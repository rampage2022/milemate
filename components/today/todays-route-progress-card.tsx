import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import { RouteStopList } from '@/components/today/route-stop-list';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TodaysRouteProgressCardProps = {
  visits: StoreVisit[];
  storesById: Record<string, Store>;
  currentVisitId: string | null;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
};

export function TodaysRouteProgressCard({
  completedCount,
  currentVisitId,
  progressPercent,
  storesById,
  totalCount,
  visits,
}: TodaysRouteProgressCardProps) {
  const [isRouteExpanded, setIsRouteExpanded] = useState(false);

  const toggleRouteExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsRouteExpanded((current) => !current);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Today&apos;s Route</Text>
      <Text style={styles.summary}>
        {completedCount} of {totalCount} stores complete
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isRouteExpanded }}
        onPress={toggleRouteExpanded}
        style={styles.toggleRow}
      >
        <Text style={styles.toggleLabel}>
          {isRouteExpanded ? "Hide Today's Route" : "View Today's Route"}
        </Text>
        <Ionicons
          color={AppColors.blue}
          name={isRouteExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
        />
      </Pressable>

      {isRouteExpanded ? (
        <RouteStopList
          currentVisitId={currentVisitId}
          storesById={storesById}
          visits={visits}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  eyebrow: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summary: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  progressTrack: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: AppColors.green,
    borderRadius: 999,
    height: '100%',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 4,
  },
  toggleLabel: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
});
