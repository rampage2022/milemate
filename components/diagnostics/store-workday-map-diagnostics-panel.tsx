import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getStores } from '@/services/stores';
import { getWorkdayTemplates } from '@/services/workday-templates';
import { getStoreImportIdRemap } from '@/services/store-import-id-aliases';
import {
  buildStoreWorkdayAssignmentIndex,
  summarizeStoreWorkdayMapDiagnostics,
} from '@/utils/store-workday-assignment-index';

export function StoreWorkdayMapDiagnosticsPanel() {
  const [lines, setLines] = useState<string[]>(['Loading store/workday map summary…']);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [templates, stores, remap] = await Promise.all([
        getWorkdayTemplates(),
        getStores(),
        getStoreImportIdRemap(),
      ]);
      const validStoreIds = new Set(stores.map((store) => store.id));
      const assignmentIndex = buildStoreWorkdayAssignmentIndex({
        templates,
        storeIdRemap: remap,
        validStoreIds,
      });
      const summary = summarizeStoreWorkdayMapDiagnostics({
        assignmentIndex,
        storeCount: stores.length,
        templates,
      });

      setLines([
        `Workday templates: ${summary.templateCount}`,
        `Templates with map metadata: ${summary.templatesWithMapMetadata}`,
        `Assigned stores (index): ${summary.assignedStoreCount}`,
        `Multi-workday stores: ${summary.multiWorkdayStoreCount}`,
        `Unassigned stores: ${summary.unassignedStoreCount ?? 'n/a'}`,
        `Orphan template store refs: ${assignmentIndex.orphanedStoreReferences.length}`,
      ]);
    } catch (loadError) {
      console.error('[StoreWorkdayMapDiagnostics] load failed:', loadError);
      setError('Could not load store/workday map summary.');
      setLines([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Store / Workday Map (Phase 1)</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {lines.map((line) => (
        <Text key={line} style={styles.row}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    fontSize: 13,
    marginBottom: 4,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 6,
  },
});
