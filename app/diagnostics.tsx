import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { DiagnosticEntryRow } from '@/components/diagnostics/diagnostic-entry-row';
import { ArrivalDiagnosticsPanel } from '@/components/diagnostics/arrival-diagnostics-panel';
import { StoreWorkdayMapDiagnosticsPanel } from '@/components/diagnostics/store-workday-map-diagnostics-panel';
import { LocationConfigReference } from '@/components/diagnostics/location-config-reference';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import { useLocationDiagnostics } from '@/hooks/use-location-diagnostics';
import { exportDiagnosticReport } from '@/services/diagnostic-report-export';
import { getLocationWatchReference } from '@/services/location-watch-reference';
import type { LocationDiagnosticEntry } from '@/types/location-diagnostic';

export default function DiagnosticsScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const resolvedTripId = typeof tripId === 'string' ? tripId : undefined;
  const { isWorkdayActive, trackingStatus } = useWorkdayTrackerContext();
  const { clear, entries, isLoading, loadedTripId, resetEvents, source, summary } =
    useLocationDiagnostics(resolvedTripId);
  const watchReference = useMemo(() => getLocationWatchReference(), []);
  const listRef = useRef<FlatList<LocationDiagnosticEntry>>(null);
  const previousFixCountRef = useRef(summary.totalFixes);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportReport = useCallback(async () => {
    setIsExporting(true);

    try {
      await exportDiagnosticReport(
        source === 'saved' ? loadedTripId ?? undefined : undefined,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to export diagnostic report.';

      Alert.alert('Export failed', message);
    } finally {
      setIsExporting(false);
    }
  }, [loadedTripId, source]);

  const sessionLabel =
    source === 'saved'
      ? `Saved session${loadedTripId ? ` (${loadedTripId.slice(0, 8)})` : ''}`
      : isWorkdayActive
        ? 'Live session'
        : 'No active session';

  const canClear = source === 'live' && isWorkdayActive;

  useEffect(() => {
    if (summary.totalFixes > previousFixCountRef.current) {
      listRef.current?.scrollToOffset({ animated: true, offset: 0 });
    }

    previousFixCountRef.current = summary.totalFixes;
  }, [summary.totalFixes]);

  const listHeader = useMemo(
    () => (
      <View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeading}>Session summary</Text>
          <Text style={styles.summaryLine}>Session source: {sessionLabel}</Text>
          <Text style={styles.summaryLine}>
            Workday status:{' '}
            {isWorkdayActive ? trackingStatus : 'idle (not tracking)'}
          </Text>
          <Text style={styles.summaryLine}>
            Total fixes: {summary.totalFixes}
          </Text>
          <Text style={styles.summaryLine}>
            Accepted segments: {summary.acceptedCount}
          </Text>
          <Text style={styles.summaryLine}>
            Ignored fixes: {summary.ignoredCount}
          </Text>
          <Text style={styles.summaryLine}>
            Authoritative workday distance:{' '}
            {summary.authoritativeDistanceMiles.toFixed(4)} mi
          </Text>
          <Text style={styles.summaryLine}>
            Distance saved at End Workday:{' '}
            {summary.distanceSavedAtEndWorkdayMiles !== null
              ? `${summary.distanceSavedAtEndWorkdayMiles.toFixed(4)} mi`
              : '—'}
          </Text>
          <Text style={styles.summaryLine}>
            Average horizontal accuracy:{' '}
            {summary.averageAccuracyMeters !== null
              ? `${summary.averageAccuracyMeters.toFixed(1)} m`
              : '—'}
          </Text>
          {resetEvents.length > 0 ? (
            <View style={styles.resetEventsBlock}>
              <Text style={styles.resetEventsHeading}>Distance reset events</Text>
              {resetEvents.map((event) => (
                <Text key={event.id} style={styles.resetEventLine}>
                  {new Date(event.timestamp).toLocaleTimeString()} —{' '}
                  {event.reason} ({event.authoritativeDistanceBeforeMiles.toFixed(4)}{' '}
                  → {event.authoritativeDistanceAfterMiles.toFixed(4)} mi, UI:{' '}
                  {event.displayedUiDistanceMiles !== null
                    ? `${event.displayedUiDistanceMiles.toFixed(4)} mi`
                    : '—'}
                  )
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.note}>
            Horizontal accuracy is in meters, not percent. Lower is better.
            Poor fixes (50+ m) still count unless the tracker ignores them —
            currently only the first baseline fix is ignored.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isExporting}
            onPress={() => {
              void handleExportReport();
            }}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && styles.exportButtonPressed,
              isExporting && styles.exportButtonDisabled,
            ]}>
            {isExporting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.exportButtonText}>Export Diagnostic Report</Text>
            )}
          </Pressable>
          <Text style={styles.exportNote}>
            Development Diagnostic — Not for tax filing. Exports the most
            recently completed workday with a full location trace.
          </Text>
        </View>

        <LocationConfigReference settings={watchReference} />

        {__DEV__ ? <ArrivalDiagnosticsPanel /> : null}

        {__DEV__ ? <StoreWorkdayMapDiagnosticsPanel /> : null}

        <Text style={styles.logHeading}>Location fix log (newest first)</Text>
      </View>
    ),
    [
      isWorkdayActive,
      summary.acceptedCount,
      summary.averageAccuracyMeters,
      summary.ignoredCount,
      summary.authoritativeDistanceMiles,
      summary.distanceSavedAtEndWorkdayMiles,
      resetEvents,
      summary.totalFixes,
      trackingStatus,
      watchReference,
      handleExportReport,
      isExporting,
      isWorkdayActive,
      loadedTripId,
      sessionLabel,
      source,
    ],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0A7EA4" size="large" />
          <Text style={styles.loadingText}>Loading diagnostic session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </Pressable>
        <Text style={styles.title}>GPS Diagnostics</Text>
        <Pressable disabled={!canClear} onPress={() => void clear()}>
          <Text style={[styles.clearButton, !canClear && styles.clearButtonDisabled]}>
            Clear
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={entries}
        extraData={summary.totalFixes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isWorkdayActive
              ? 'Waiting for location fixes...'
              : 'No location fixes recorded yet. Start a workday and move to collect diagnostic data.'}
          </Text>
        }
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => <DiagnosticEntryRow entry={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    color: '#0A7EA4',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonDisabled: {
    color: '#D1D5DB',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  summaryHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryLine: {
    fontSize: 14,
    marginBottom: 4,
  },
  note: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  exportButton: {
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
    borderRadius: 10,
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  exportButtonPressed: {
    opacity: 0.85,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  exportNote: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    textAlign: 'center',
  },
  resetEventsBlock: {
    marginTop: 10,
  },
  resetEventsHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  resetEventLine: {
    color: '#7C2D12',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  logHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
  },
});
