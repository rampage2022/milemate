import { StyleSheet, Text, View } from 'react-native';

import type { LocationDiagnosticEntry } from '@/types/location-diagnostic';

type DiagnosticEntryRowProps = {
  entry: LocationDiagnosticEntry;
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const tenths = Math.floor(date.getMilliseconds() / 100);

  return `${hours}:${minutes}:${seconds}.${tenths}`;
}

function formatSpeed(speedMps: number | null): string {
  if (speedMps === null) {
    return '—';
  }

  const mph = speedMps * 2.23694;
  return `${speedMps.toFixed(2)} m/s (${mph.toFixed(1)} mph)`;
}

function formatMiles(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return `${value.toFixed(4)} mi`;
}

export function DiagnosticEntryRow({ entry }: DiagnosticEntryRowProps) {
  return (
    <View
      style={[
        styles.row,
        entry.ignored ? styles.rowIgnored : styles.rowAccepted,
      ]}
    >
      <Text style={styles.sequence}>#{entry.sequence}</Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Time: </Text>
        {formatTimestamp(entry.timestamp)}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Lat/Lng: </Text>
        {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Horizontal accuracy: </Text>
        {entry.horizontalAccuracyMeters !== null
          ? `${entry.horizontalAccuracyMeters.toFixed(1)} m`
          : '—'}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Speed: </Text>
        {formatSpeed(entry.speedMps)}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Authoritative distance before: </Text>
        {formatMiles(entry.authoritativeDistanceBeforeMiles)}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Segment distance: </Text>
        {formatMiles(entry.distanceFromPreviousMiles)}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Authoritative distance after: </Text>
        {formatMiles(entry.authoritativeDistanceAfterMiles)}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Displayed UI distance: </Text>
        {formatMiles(entry.displayedUiDistanceMiles)}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Distance saved at End Workday: </Text>
        {formatMiles(entry.distanceSavedAtEndWorkdayMiles)}
      </Text>
      <Text style={styles.line}>
        <Text style={styles.label}>Ignored: </Text>
        {entry.ignored ? 'Yes' : 'No'}
      </Text>
      {entry.ignoredReason ? (
        <Text style={styles.reason}>{entry.ignoredReason}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  rowAccepted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  rowIgnored: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  sequence: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  line: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  label: {
    fontWeight: '600',
  },
  reason: {
    color: '#92400E',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
