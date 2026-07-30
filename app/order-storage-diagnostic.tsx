import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppColors } from '@/components/shared/app-theme';
import {
  collectOrderStorageDiagnosticReport,
  type OrderStorageDiagnosticReport,
} from '@/services/order-storage-diagnostic';
import {
  applyStoreOrderStoreIdRecovery,
  previewStoreOrderStoreIdRecovery,
} from '@/services/store-order-recovery';
import { exportOrderStorageDiagnosticBackup } from '@/services/order-storage-export';

function formatTimestamp(ms: number | null): string {
  if (ms === null) {
    return '—';
  }

  return new Date(ms).toLocaleString();
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function OrderStorageDiagnosticScreen() {
  const router = useRouter();
  const [report, setReport] = useState<OrderStorageDiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recoveryPreview, setRecoveryPreview] = useState<
    Awaited<ReturnType<typeof previewStoreOrderStoreIdRecovery>> | null
  >(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadReport = useCallback(async () => {
    setIsLoading(true);

    try {
      const [nextReport, nextRecoveryPreview] = await Promise.all([
        collectOrderStorageDiagnosticReport(),
        previewStoreOrderStoreIdRecovery(),
      ]);
      setReport(nextReport);
      setRecoveryPreview(nextRecoveryPreview);
    } catch (error) {
      console.error('[OrderStorageDiagnostic] load failed:', error);
      Alert.alert(
        'Diagnostic failed',
        error instanceof Error ? error.message : 'Could not read order storage.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadReport();
    }, [loadReport]),
  );

  async function handleApplyRecovery() {
    setIsRecovering(true);

    try {
      const result = await applyStoreOrderStoreIdRecovery();
      Alert.alert(
        result.applied ? 'Recovery applied' : 'No remapping needed',
        result.applied
          ? `Remapped ${result.ordersRemapped} order(s). A one-time backup was preserved at ${result.backupKey}.`
          : 'Order store IDs already match the store library (or no duplicate clusters were found).',
      );
      await loadReport();
    } catch (error) {
      Alert.alert(
        'Recovery failed',
        error instanceof Error ? error.message : 'Could not remap order store IDs.',
      );
    } finally {
      setIsRecovering(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);

    try {
      const uri = await exportOrderStorageDiagnosticBackup();
      Alert.alert('Backup exported', `JSON backup created (read-only).\n\n${uri}`);
    } catch (error) {
      Alert.alert(
        'Export failed',
        error instanceof Error ? error.message : 'Could not export backup.',
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Order Storage Diagnostic</Text>
        <Text style={styles.body}>This screen is available in development builds only.</Text>
        <Pressable onPress={() => router.back()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.backLink}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Order Storage Diagnostic</Text>
        <Text style={styles.subtitle}>
          Read-only inspection of AsyncStorage order data. Does not modify persisted records.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={AppColors.blue} size="large" style={styles.loader} />
        ) : null}

        {report ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <MetricRow label="Current key" value={report.currentStorageKey} />
            <MetricRow label="Hydration" value={report.hydrationStatus} />
            <MetricRow
              label="Raw records (current key)"
              value={`${report.perKey[report.currentStorageKey]?.rawRecordCount ?? 0}`}
            />
            <MetricRow
              label="Valid current-schema records"
              value={`${report.totalValidCurrentSchemaRecords}`}
            />
            <MetricRow
              label="Legacy keys with data"
              value={
                report.legacyKeysWithData.length > 0
                  ? report.legacyKeysWithData.join(', ')
                  : 'None'
              }
            />
            <MetricRow
              label="Unmatched store IDs"
              value={`${report.unmatchedStoreIdCount}`}
            />
            <MetricRow label="Earliest order" value={formatTimestamp(report.earliestOrderTimestampMs)} />
            <MetricRow label="Latest order" value={formatTimestamp(report.latestOrderTimestampMs)} />
            <MetricRow label="Scanned at" value={report.scannedAt} />
          </View>
        ) : null}

        {report ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Keys scanned</Text>
            {Object.values(report.perKey).map((snapshot) => (
              <View key={snapshot.key} style={styles.keyBlock}>
                <Text style={styles.keyName}>{snapshot.key}</Text>
                <Text style={styles.keyMeta}>
                  present={snapshot.present ? 'yes' : 'no'} · shape={snapshot.topLevelShape} · count=
                  {snapshot.rawRecordCount} · valid={snapshot.validCurrentSchemaCount}
                </Text>
                {snapshot.parseError ? (
                  <Text style={styles.keyError}>parse: {snapshot.parseError}</Text>
                ) : null}
                {snapshot.storeIds.length > 0 ? (
                  <Text style={styles.keyMeta}>storeIds: {snapshot.storeIds.length}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {report && report.unmatchedStoreIds.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Unmatched store IDs</Text>
            {report.unmatchedStoreIds.map((storeId) => (
              <Text key={storeId} style={styles.monoLine}>
                {storeId}
              </Text>
            ))}
          </View>
        ) : null}

        {recoveryPreview ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Store ID recovery (re-import)</Text>
            <MetricRow
              label="Duplicate clusters"
              value={`${recoveryPreview.clusters.length}`}
            />
            <MetricRow label="Orders to remap" value={`${recoveryPreview.ordersRemapped}`} />
            <MetricRow
              label="Unmatched after remap"
              value={`${recoveryPreview.unmatchedStoreIdsAfterRemap.length}`}
            />
            {recoveryPreview.remapEntries.length > 0 ? (
              recoveryPreview.remapEntries.map((entry) => (
                <Text key={`${entry.fromStoreId}-${entry.toStoreId}`} style={styles.monoLine}>
                  {entry.fromStoreId} → {entry.toStoreId}
                </Text>
              ))
            ) : (
              <Text style={styles.keyMeta}>No automatic remap pairs detected.</Text>
            )}
            <Pressable
              disabled={isRecovering || isLoading}
              onPress={() => {
                void handleApplyRecovery();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                (isRecovering || isLoading) && styles.primaryButtonDisabled,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isRecovering ? 'Applying…' : 'Apply safe store ID remap'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          disabled={isExporting || isLoading}
          onPress={() => {
            void handleExport();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            (isExporting || isLoading) && styles.primaryButtonDisabled,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isExporting ? 'Exporting…' : 'Export diagnostic JSON backup'}
          </Text>
        </Pressable>

        <Pressable
          disabled={isLoading}
          onPress={() => {
            void loadReport();
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.primaryButtonPressed]}
        >
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backLink: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  body: {
    color: AppColors.textSecondary,
    fontSize: 15,
    marginBottom: 16,
  },
  loader: {
    marginVertical: 24,
  },
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginBottom: 16,
    padding: 16,
  },
  cardTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricRow: {
    gap: 2,
  },
  metricLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: AppColors.textPrimary,
    fontSize: 14,
  },
  keyBlock: {
    borderTopColor: AppColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingTop: 10,
  },
  keyName: {
    color: AppColors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  keyMeta: {
    color: AppColors.textSecondary,
    fontSize: 13,
  },
  keyError: {
    color: AppColors.red,
    fontSize: 13,
  },
  monoLine: {
    color: AppColors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
});
