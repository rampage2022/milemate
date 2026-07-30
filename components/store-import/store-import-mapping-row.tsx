import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { MappingConfidence, StoreImportField } from '@/types/store-import';
import {
  MAPPABLE_STORE_IMPORT_FIELDS,
  STORE_IMPORT_FIELD_LABELS,
} from '@/types/store-import';

type Props = {
  sourceColumn: string;
  sampleValues: string[];
  selectedField: StoreImportField;
  confidence: MappingConfidence;
  onSelectField: (field: StoreImportField) => void;
};

const CONFIDENCE_LABELS: Record<MappingConfidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unmapped: 'Unmapped',
};

const CONFIDENCE_COLORS: Record<MappingConfidence, string> = {
  high: '#15803D',
  medium: '#CA8A04',
  low: '#DC2626',
  unmapped: AppColors.textMuted,
};

export function StoreImportMappingRow({
  sourceColumn,
  sampleValues,
  selectedField,
  confidence,
  onSelectField,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.columnLabel}>Imported column</Text>
      <Text style={styles.columnName}>{sourceColumn}</Text>
      <Text style={styles.sampleLabel}>Samples</Text>
      <Text style={styles.samples}>
        {sampleValues.length > 0 ? sampleValues.join(', ') : '—'}
      </Text>
      <Text style={styles.sampleLabel}>Suggested field</Text>
      <Text style={styles.selectedField}>{STORE_IMPORT_FIELD_LABELS[selectedField]}</Text>
      <Text style={[styles.confidence, { color: CONFIDENCE_COLORS[confidence] }]}>
        Confidence: {CONFIDENCE_LABELS[confidence]}
      </Text>
      <View style={styles.options}>
        {MAPPABLE_STORE_IMPORT_FIELDS.map((field) => {
          const active = field === selectedField;

          return (
            <Pressable
              key={field}
              onPress={() => onSelectField(field)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {STORE_IMPORT_FIELD_LABELS[field]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
    padding: 16,
  },
  columnLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  columnName: {
    fontSize: 17,
    fontWeight: '700',
  },
  sampleLabel: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  samples: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  selectedField: {
    fontSize: 15,
    fontWeight: '700',
  },
  confidence: {
    fontSize: 14,
    fontWeight: '600',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  option: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionActive: {
    backgroundColor: AppColors.blue,
  },
  optionText: {
    color: AppColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
});
