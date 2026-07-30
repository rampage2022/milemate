import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { StoreImportMappingRow } from '@/components/store-import/store-import-mapping-row';
import { StoreImportPreviewRow } from '@/components/store-import/store-import-preview-row';
import { AppColors } from '@/components/shared/app-theme';
import {
  applyDuplicateDecisions,
  buildImportPreviewRows,
  importStoresSafely,
  summarizeImportPreview,
} from '@/services/import-stores';
import { extractTextFromImageUri } from '@/services/extract-text-from-image-uri';
import { getStores } from '@/services/stores';
import type {
  ColumnMappingSuggestion,
  DuplicateDecision,
  ImportExecutionResult,
  ImportPreviewRow,
  ParsedStoreCsv,
  StoreImportField,
  StoreImportMapping,
} from '@/types/store-import';
import {
  SAMPLE_CSV_TEMPLATE,
  SAMPLE_FULL_ADDRESS_CSV_TEMPLATE,
} from '@/types/store-import';
import {
  analyzeStoreImportColumns,
  buildMappingFromSuggestions,
  canAutoContinueToPreview,
  getMappingConflicts,
  hasRequiredLocationMappings,
} from '@/utils/store-import/analyze-store-import-columns';
import {
  parsePastedStoreImportText,
  parseRecognizedAddressText,
} from '@/utils/store-import/parse-pasted-store-import';
import { isAcceptedCsvFile, parseStoreCsv } from '@/utils/store-import/parse-store-csv';
import { readDocumentPickerAssetAsText } from '@/utils/read-document-file-text';

type ImportStep = 'pick' | 'mapping' | 'preview' | 'result';

export function StoreImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>('pick');
  const [isBusy, setIsBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [rowNumbers, setRowNumbers] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<ColumnMappingSuggestion[]>([]);
  const [mapping, setMapping] = useState<StoreImportMapping>({});
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<number, DuplicateDecision>>({});
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [pastedText, setPastedText] = useState('');

  const mappingConflicts = useMemo(() => getMappingConflicts(mapping), [mapping]);
  const previewSummary = useMemo(() => summarizeImportPreview(previewRows), [previewRows]);
  const canContinueMapping = hasRequiredLocationMappings(mapping) && mappingConflicts.length === 0;
  const canImportPastedText = pastedText.trim().length > 0 && !isBusy;

  function beginImportFromParsed(parsed: ParsedStoreCsv, sourceLabel: string) {
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      Alert.alert(
        'Nothing to import',
        parsed.errors[0] ?? 'Add at least one address or CSV row.',
      );
      return;
    }

    const analyzed = analyzeStoreImportColumns(parsed.headers, parsed.rows);
    const initialMapping = buildMappingFromSuggestions(analyzed);

    setFileName(sourceLabel);
    setParseErrors(parsed.errors);
    setRows(parsed.rows);
    setRowNumbers(parsed.rowNumbers);
    setSuggestions(analyzed);
    setMapping(initialMapping);
    setPreviewRows([]);
    setDuplicateDecisions({});
    setImportResult(null);
    setStep('mapping');
  }

  async function handlePickFile() {
    setIsBusy(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/plain',
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.ms-excel',
          'application/octet-stream',
          '*/*',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const acceptance = isAcceptedCsvFile({
        name: asset.name,
        mimeType: asset.mimeType,
      });

      if (!acceptance.accepted) {
        Alert.alert('Unsupported file', acceptance.reason ?? 'Please choose a CSV file.');
        return;
      }

      const content = await readDocumentPickerAssetAsText(asset);
      const parsed = parseStoreCsv(content);
      beginImportFromParsed(parsed, asset.name ?? 'Selected CSV');
    } catch (error) {
      console.error('[StoreImport] pick file failed:', error);
      Alert.alert('Import failed', 'Could not read the selected CSV file.');
    } finally {
      setIsBusy(false);
    }
  }

  function handleImportPastedText() {
    const parsed = parsePastedStoreImportText(pastedText);
    beginImportFromParsed(parsed, 'Pasted addresses');
  }

  async function handleImportFromPhoto() {
    setIsBusy(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          'Allow photo library access to import addresses from a picture.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const recognized = await extractTextFromImageUri(result.assets[0].uri);

      if (!recognized) {
        Alert.alert(
          'Could not read photo',
          'Text recognition is not available in this build yet. Paste the addresses below, or use a CSV file.',
        );
        return;
      }

      const parsed = parseRecognizedAddressText(recognized);
      beginImportFromParsed(parsed, 'Photo import');
    } catch (error) {
      console.error('[StoreImport] photo import failed:', error);
      Alert.alert('Import failed', 'Could not read text from the selected photo.');
    } finally {
      setIsBusy(false);
    }
  }

  function handleMappingChange(column: string, field: StoreImportField) {
    setMapping((current) => ({
      ...current,
      [column]: field,
    }));
  }

  async function handleContinueToPreview() {
    if (!canContinueMapping) {
      Alert.alert(
        'Resolve mappings',
        'Map enough location fields and resolve duplicate target fields before continuing.',
      );
      return;
    }

    setIsBusy(true);

    try {
      const existingStores = await getStores();
      const builtPreview = buildImportPreviewRows(rows, rowNumbers, mapping, existingStores);

      setPreviewRows(builtPreview);
      setStep('preview');
    } catch (error) {
      console.error('[StoreImport] preview build failed:', error);
      Alert.alert('Preview failed', 'Could not build the import preview.');
    } finally {
      setIsBusy(false);
    }
  }

  function handleDuplicateDecision(rowNumber: number, decision: DuplicateDecision) {
    setDuplicateDecisions((current) => ({
      ...current,
      [rowNumber]: decision,
    }));
  }

  const resolvedPreviewRows = useMemo(
    () => applyDuplicateDecisions(previewRows, duplicateDecisions),
    [duplicateDecisions, previewRows],
  );

  const resolvedSummary = useMemo(
    () => summarizeImportPreview(resolvedPreviewRows),
    [resolvedPreviewRows],
  );

  const unresolvedDuplicates = resolvedPreviewRows.some(
    (row) => row.outcome === 'possible_duplicate',
  );

  async function handleConfirmImport() {
    if (unresolvedDuplicates) {
      Alert.alert(
        'Resolve duplicates',
        'Choose Update, Create new, or Skip for each possible duplicate before importing.',
      );
      return;
    }

    const readyCount =
      resolvedSummary.newStores + resolvedSummary.updates + resolvedSummary.warningRows;
    const skippedCount = resolvedSummary.skipped;

    Alert.alert(
      'Confirm import',
      `${readyCount} stores are ready to import.\n${resolvedSummary.newStores} will be created.\n${resolvedSummary.updates} will be updated.\n${skippedCount} rows contain errors and will be skipped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'default',
          onPress: () => {
            void runImport();
          },
        },
      ],
    );
  }

  async function runImport() {
    setIsBusy(true);

    try {
      const result = await importStoresSafely(resolvedPreviewRows);
      setImportResult(result);
      setStep('result');
    } catch (error) {
      console.error('[StoreImport] import failed:', error);
      Alert.alert('Import failed', 'The store collection was not changed.');
    } finally {
      setIsBusy(false);
    }
  }

  function handleBack() {
    if (step === 'preview') {
      setStep('mapping');
      return;
    }

    if (step === 'mapping') {
      setStep('pick');
      return;
    }

    router.back();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={handleBack}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Import Stores</Text>

        {step === 'pick' ? (
          <>
            <Text style={styles.body}>
              Import a CSV file, paste addresses, or import from a photo of a list. Store number
              and store name are optional. Each row needs enough location information to form a
              usable address.
            </Text>
            <Pressable
              disabled={isBusy}
              onPress={() => {
                void handlePickFile();
              }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Select CSV File</Text>
              )}
            </Pressable>
            <Pressable
              disabled={isBusy}
              onPress={() => {
                void handleImportFromPhoto();
              }}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Import from Photo</Text>
            </Pressable>
            <Text style={styles.sectionLabel}>Paste addresses</Text>
            <Text style={styles.pasteHint}>
              One address per line, or paste CSV text with column headers.
            </Text>
            <TextInput
              editable={!isBusy}
              multiline
              onChangeText={setPastedText}
              placeholder={'2150 N Josey Ln, Carrollton, TX 75006\n1714 Williams Rd, Irving, TX'}
              placeholderTextColor={AppColors.textMuted}
              style={styles.pasteInput}
              textAlignVertical="top"
              value={pastedText}
            />
            <Pressable
              disabled={!canImportPastedText}
              onPress={handleImportPastedText}
              style={({ pressed }) => [
                styles.primaryButton,
                !canImportPastedText && styles.disabled,
                pressed && canImportPastedText && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Import Pasted Text</Text>
            </Pressable>
            <View style={styles.templateCard}>
              <Text style={styles.templateTitle}>Optional sample templates</Text>
              <Text style={styles.templateHint}>
                Store number and store name are optional. Separate address fields:
              </Text>
              <Text selectable style={styles.templateText}>
                {SAMPLE_CSV_TEMPLATE.trim()}
              </Text>
              <Text style={styles.templateHint}>Or one full address field:</Text>
              <Text selectable style={styles.templateText}>
                {SAMPLE_FULL_ADDRESS_CSV_TEMPLATE.trim()}
              </Text>
            </View>
          </>
        ) : null}

        {step === 'mapping' ? (
          <>
            <Text style={styles.sectionLabel}>Selected file</Text>
            <Text style={styles.fileName}>{fileName}</Text>
            {parseErrors.length > 0 ? (
              <Text style={styles.warningText}>
                Parser warnings: {parseErrors.join('; ')}
              </Text>
            ) : null}
            <Text style={styles.body}>
              Review suggested column mappings before preview. Correct anything that looks wrong.
            </Text>
            {canAutoContinueToPreview(suggestions, mapping) ? (
              <Text style={styles.successText}>
                High-confidence location mappings detected. Review the summary below, then continue.
              </Text>
            ) : null}
            {mappingConflicts.length > 0 ? (
              <Text style={styles.warningText}>
                Resolve conflicting mappings: {mappingConflicts.join(', ')}
              </Text>
            ) : null}
            {!hasRequiredLocationMappings(mapping) ? (
              <Text style={styles.warningText}>
                Map a full address or a street address plus city, state, or ZIP.
              </Text>
            ) : null}
            {suggestions.map((suggestion) => (
              <StoreImportMappingRow
                key={suggestion.sourceColumn}
                confidence={suggestion.confidence}
                onSelectField={(field) => handleMappingChange(suggestion.sourceColumn, field)}
                sampleValues={suggestion.sampleValues}
                selectedField={mapping[suggestion.sourceColumn] ?? 'ignore'}
                sourceColumn={suggestion.sourceColumn}
              />
            ))}
            <Pressable
              disabled={!canContinueMapping || isBusy}
              onPress={() => {
                void handleContinueToPreview();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                (!canContinueMapping || isBusy) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Continue to Preview</Text>
            </Pressable>
          </>
        ) : null}

        {step === 'preview' ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Import Preview</Text>
              <Text style={styles.summaryLine}>Total rows: {previewSummary.totalRows}</Text>
              <Text style={styles.summaryLine}>Valid rows: {previewSummary.validRows}</Text>
              <Text style={styles.summaryLine}>Valid with warnings: {previewSummary.warningRows}</Text>
              <Text style={styles.summaryLine}>Invalid rows: {previewSummary.invalidRows}</Text>
              <Text style={styles.summaryLine}>New stores: {resolvedSummary.newStores}</Text>
              <Text style={styles.summaryLine}>Stores to update: {resolvedSummary.updates}</Text>
              <Text style={styles.summaryLine}>
                Possible duplicates: {resolvedSummary.possibleDuplicates}
              </Text>
            </View>
            {resolvedPreviewRows.map((row) => (
              <StoreImportPreviewRow
                key={row.rowNumber}
                duplicateDecision={duplicateDecisions[row.rowNumber]}
                onDuplicateDecisionChange={
                  row.outcome === 'possible_duplicate'
                    ? (decision) => handleDuplicateDecision(row.rowNumber, decision)
                    : undefined
                }
                row={row}
              />
            ))}
            <Pressable
              disabled={isBusy}
              onPress={() => {
                void handleConfirmImport();
              }}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Confirm Import</Text>
            </Pressable>
          </>
        ) : null}

        {step === 'result' && importResult ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Import Complete</Text>
              <Text style={styles.summaryLine}>Created: {importResult.created}</Text>
              <Text style={styles.summaryLine}>Updated: {importResult.updated}</Text>
              <Text style={styles.summaryLine}>Skipped: {importResult.skipped}</Text>
              <Text style={styles.summaryLine}>Failed: {importResult.failed}</Text>
              <Text style={styles.summaryLine}>Warnings: {importResult.warnings}</Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  back: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  sectionLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  pasteHint: {
    color: AppColors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  pasteInput: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 20,
    padding: 16,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  templateHint: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  templateText: {
    color: AppColors.textPrimary,
    fontFamily: 'Menlo',
    fontSize: 12,
    lineHeight: 18,
  },
  warningText: {
    color: '#CA8A04',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  successText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginBottom: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLine: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
});
