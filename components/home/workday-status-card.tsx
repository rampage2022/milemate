import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { WorkdayStatColumn } from '@/components/home/workday-stat-column';
import { HomeColors } from '@/components/home/theme';
import type { WorkdayTrackingStatus } from '@/hooks/use-workday-tracker';

type WorkdayStatusCardProps = {
  distanceMiles: number;
  durationValue: string;
  durationUnit: string;
  isWorkdayActive: boolean;
  trackingDetailText: string;
  trackingStatus: WorkdayTrackingStatus;
};

export function WorkdayStatusCard({
  distanceMiles,
  durationUnit,
  durationValue,
  isWorkdayActive,
  trackingDetailText,
  trackingStatus,
}: WorkdayStatusCardProps) {
  const showActiveHeader = isWorkdayActive;
  const showTrackingFooter = isWorkdayActive;
  const isTrackingActive = trackingStatus === 'active';
  const isStarting = trackingStatus === 'starting';

  return (
    <View style={styles.card}>
      {showActiveHeader ? (
        <>
          <View style={styles.activeHeader}>
            <View style={styles.activeDot} />
            <Text style={styles.activeHeaderText}>Workday in progress</Text>
          </View>
          <View style={styles.divider} />
        </>
      ) : (
        <Text style={styles.idleLabel}>Current Workday</Text>
      )}

      <View style={styles.statsRow}>
        <WorkdayStatColumn
          icon="time-outline"
          label="Duration"
          value={durationValue}
          unit={durationUnit}
        />

        <View style={styles.statDivider} />

        <WorkdayStatColumn
          icon="navigate-outline"
          label="Distance"
          value={distanceMiles.toFixed(2)}
          unit="miles"
        />
      </View>

      {showTrackingFooter ? (
        <>
          <View style={styles.divider} />
          <View style={styles.trackingRow}>
            <View style={styles.trackingIconWrap}>
              {isStarting ? (
                <ActivityIndicator size="small" color={HomeColors.green} />
              ) : (
                <Ionicons
                  name="radio-outline"
                  size={22}
                  color={HomeColors.green}
                />
              )}
            </View>

            <View style={styles.trackingCopy}>
              <Text style={styles.trackingTitle}>{trackingDetailText}</Text>
              {isTrackingActive ? (
                <Text style={styles.trackingSubtitle}>
                  Your location is being recorded
                </Text>
              ) : null}
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={HomeColors.textMuted}
            />
          </View>
        </>
      ) : (
        <Text style={styles.idleStatus}>{trackingDetailText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: HomeColors.card,
    borderColor: HomeColors.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  activeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 18,
  },
  activeDot: {
    backgroundColor: HomeColors.green,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  activeHeaderText: {
    color: HomeColors.green,
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: HomeColors.border,
    height: 1,
    marginBottom: 18,
    width: '100%',
  },
  idleLabel: {
    color: HomeColors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 18,
    textAlign: 'center',
  },
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  statDivider: {
    alignSelf: 'stretch',
    backgroundColor: HomeColors.border,
    marginHorizontal: 4,
    width: 1,
  },
  trackingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  trackingIconWrap: {
    alignItems: 'center',
    backgroundColor: HomeColors.greenSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  trackingCopy: {
    flex: 1,
  },
  trackingTitle: {
    color: HomeColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  trackingSubtitle: {
    color: HomeColors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  idleStatus: {
    color: HomeColors.textSecondary,
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
});
