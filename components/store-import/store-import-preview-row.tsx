import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { DuplicateDecision, ImportPreviewRow } from '@/types/store-import';

type Props = {
  row: ImportPreviewRow;
  duplicateDecision?: DuplicateDecision;
  onDuplicateDecisionChange?: (decision: DuplicateDecision) => void;
};

const OUTCOME_LABELS: Record<ImportPreviewRow['outcome'], string> = {
  create: 'New',
  update: 'Update',
  warning: 'Warning',
  possible_duplicate: 'Possible Duplicate',
  duplicate_in_file: 'Duplicate in File',
  error: 'Error',
  skip: 'Skip',
};

const OUTCOME_COLORS: Record<ImportPreviewRow['outcome'], string> = {
  create: '#15803D',
  update: '#2563EB',
  warning: '#CA8A04',
  possible_duplicate: '#9333EA',
  duplicate_in_file: '#DC2626',
  error: '#DC2626',
  skip: AppColors.textMuted,
};

export function StoreImportPreviewRow({
  row,
  duplicateDecision,
  onDuplicateDecisionChange,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{row.resolved.displayTitle}</Text>
        <Text style={[styles.outcome, { color: OUTCOME_COLORS[row.outcome] }]}>
          {OUTCOME_LABELS[row.outcome]}
        </Text>
      </View>
      <Text style={styles.meta}>Row {row.rowNumber}</Text>
      <Text style={styles.address}>{row.resolved.formattedAddress}</Text>
      {row.resolved.storeNumber ? (
        <Text style={styles.detail}>Store number: {row.resolved.storeNumber}</Text>
      ) : null}
      {row.resolved.storeName ? (
        <Text style={styles.detail}>Store name: {row.resolved.storeName}</Text>
      ) : null}
      {row.resolved.messages.map((message) => (
        <Text key={message} style={styles.warning}>
          {message}
        </Text>
      ))}
      {row.outcome === 'possible_duplicate' && onDuplicateDecisionChange ? (
        <View style={styles.decisions}>
          {(['update', 'create', 'skip'] as DuplicateDecision[]).map((decision) => {
            const active = duplicateDecision === decision;

            return (
              <Pressable
                key={decision}
                onPress={() => onDuplicateDecisionChange(decision)}
                style={[styles.decisionButton, active && styles.decisionButtonActive]}
              >
                <Text
                  style={[styles.decisionText, active && styles.decisionTextActive]}
                >
                  {decision === 'update'
                    ? 'Update existing'
                    : decision === 'create'
                      ? 'Create new'
                      : 'Skip'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginBottom: 12,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  outcome: {
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  detail: {
    color: AppColors.textSecondary,
    fontSize: 13,
  },
  warning: {
    color: '#CA8A04',
    fontSize: 13,
    fontWeight: '600',
  },
  decisions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  decisionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  decisionButtonActive: {
    backgroundColor: AppColors.blue,
  },
  decisionText: {
    color: AppColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  decisionTextActive: {
    color: '#FFFFFF',
  },
});
