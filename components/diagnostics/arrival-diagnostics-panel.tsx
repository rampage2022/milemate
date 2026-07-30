import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import { useArrivalCheckIn } from '@/contexts/arrival-check-in-context';
import {
  DEFAULT_STORE_ARRIVAL_CONFIG,
  getExitRadiusMeters,
} from '@/services/store-arrival';
import { AUTO_CHECK_IN_MODE_LABELS } from '@/types/auto-check-in';

export function ArrivalDiagnosticsPanel() {
  const {
    accuracyMeters,
    arrivalStatus,
    autoCheckInMode,
    distanceMeters,
    dwellRemainingMs,
    hasArrived,
    isAutomaticCheckInPending,
    isSimulated,
    rejectionReason,
    showAskPrompt,
  } = useArrivalCheckIn();

  const config = DEFAULT_STORE_ARRIVAL_CONFIG;
  const exitRadius = getExitRadiusMeters(config);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Arrival Diagnostics</Text>
      <Text style={styles.row}>Status: {arrivalStatus}</Text>
      <Text style={styles.row}>Has arrived: {hasArrived ? 'yes' : 'no'}</Text>
      <Text style={styles.row}>
        Auto check-in mode: {AUTO_CHECK_IN_MODE_LABELS[autoCheckInMode]}
      </Text>
      <Text style={styles.row}>Simulated: {isSimulated ? 'yes' : 'no'}</Text>
      <Text style={styles.row}>
        Automatic handling pending: {isAutomaticCheckInPending ? 'yes' : 'no'}
      </Text>
      <Text style={styles.row}>Ask prompt visible: {showAskPrompt ? 'yes' : 'no'}</Text>
      <Text style={styles.row}>
        Distance from store:{' '}
        {distanceMeters === null ? 'n/a' : `${Math.round(distanceMeters)} m`}
      </Text>
      <Text style={styles.row}>
        Accuracy:{' '}
        {accuracyMeters === null ? 'n/a' : `${Math.round(accuracyMeters)} m`}
      </Text>
      <Text style={styles.row}>
        Dwell remaining:{' '}
        {dwellRemainingMs === null ? 'n/a' : `${Math.round(dwellRemainingMs)} ms`}
      </Text>
      <Text style={styles.row}>Entry radius: {config.enterRadiusMeters} m</Text>
      <Text style={styles.row}>Exit radius: {exitRadius} m</Text>
      <Text style={styles.row}>
        Rejection reason: {rejectionReason ?? 'none'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 16,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  row: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontFamily: 'Menlo',
  },
});
