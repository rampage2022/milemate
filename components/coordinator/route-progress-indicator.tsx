import { StyleSheet, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import {
  ROUTE_PROGRESS_SEGMENT_THRESHOLD,
  resolveRouteProgressSegmentState,
} from '@/utils/route-progress-indicator';

const segmentColors = {
  completed: AppColors.green,
  current: AppColors.blue,
  upcoming: '#E5E7EB',
} as const;

type RouteProgressIndicatorProps = {
  accessibilityLabel: string;
  completedStops: number;
  currentStopIndex: number | null;
  totalStops: number;
};

export function RouteProgressIndicator({
  accessibilityLabel,
  completedStops,
  currentStopIndex,
  totalStops,
}: RouteProgressIndicatorProps) {
  if (totalStops <= 0) {
    return null;
  }

  const useSegments = totalStops <= ROUTE_PROGRESS_SEGMENT_THRESHOLD;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      {useSegments ? (
        <View style={styles.segmentRow}>
          {Array.from({ length: totalStops }, (_, index) => {
            const state = resolveRouteProgressSegmentState({
              completedStops,
              currentStopIndex,
              index,
            });

            return (
              <View
                key={index}
                style={[styles.segment, { backgroundColor: segmentColors[state] }]}
              />
            );
          })}
        </View>
      ) : (
        <View style={styles.barTrack}>
          {currentStopIndex === null ? (
            <View style={[styles.barSection, styles.barCompleted, { flex: totalStops }]} />
          ) : (
            <>
              {completedStops > 0 ? (
                <View style={[styles.barSection, styles.barCompleted, { flex: completedStops }]} />
              ) : null}
              <View style={[styles.barSection, styles.barCurrent, { flex: 1 }]} />
              {totalStops - completedStops - 1 > 0 ? (
                <View
                  style={[
                    styles.barSection,
                    styles.barUpcoming,
                    { flex: totalStops - completedStops - 1 },
                  ]}
                />
              ) : null}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 1,
    width: '100%',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 2,
    width: '100%',
  },
  segment: {
    borderRadius: 999,
    flex: 1,
    height: 4,
    minWidth: 0,
  },
  barTrack: {
    borderRadius: 999,
    flexDirection: 'row',
    height: 4,
    overflow: 'hidden',
    width: '100%',
  },
  barSection: {
    height: '100%',
  },
  barCompleted: {
    backgroundColor: AppColors.green,
  },
  barCurrent: {
    backgroundColor: AppColors.blue,
  },
  barUpcoming: {
    backgroundColor: '#E5E7EB',
  },
});
