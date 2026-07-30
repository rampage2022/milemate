import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MileMateDatePicker } from '@/components/shared/milemate-date-picker';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import {
  formatStoreOrderDateString,
  formatStoreOrderDeliveryDate,
  isValidStoreOrderDateString,
  parseStoreOrderDateString,
} from '@/utils/store-order-presentation';

type PlaceOrderSheetProps = {
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: {
    expectedDeliveryDate: string;
    note?: string;
    placedAt: string;
  }) => Promise<void>;
  visible: boolean;
};

function dateFromDateString(value: string): Date | null {
  return parseStoreOrderDateString(value);
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const isValid = isValidStoreOrderDateString(value);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        onChangeText={onChange}
        placeholder="MM-DD-YY"
        style={[styles.dateInput, !isValid && value.length > 0 && styles.dateInputInvalid]}
        value={value}
      />
      {isValid ? (
        <Text style={styles.datePreview}>{formatStoreOrderDeliveryDate(value)}</Text>
      ) : value.length > 0 ? (
        <Text style={styles.validationText}>Enter a valid date (MM-DD-YY).</Text>
      ) : null}
    </View>
  );
}

function ExpectedDeliveryDateField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const isValid = isValidStoreOrderDateString(value);
  const pickerDate = dateFromDateString(value) ?? new Date();

  useEffect(() => {
    if (!value) {
      setShowPicker(false);
    }
  }, [value]);

  function handlePickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);

      if (event.type === 'dismissed' || !selectedDate) {
        return;
      }

      onChange(formatStoreOrderDateString(selectedDate));
      return;
    }

    if (selectedDate) {
      onChange(formatStoreOrderDateString(selectedDate));
    }
  }

  if (Platform.OS === 'web') {
    return (
      <DateField label="Expected Delivery" onChange={onChange} value={value} />
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Expected Delivery</Text>
      <Pressable
        accessibilityLabel="Select expected delivery date"
        accessibilityRole="button"
        onPress={() => {
          setShowPicker(true);
        }}
        style={({ pressed }) => [styles.datePickerButton, pressed && styles.pressed]}
      >
        <Text style={isValid ? styles.datePickerValue : styles.datePickerPlaceholder}>
          {isValid ? formatStoreOrderDeliveryDate(value) : 'Select delivery date'}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && showPicker ? (
        <View style={styles.calendarPopout}>
          <MileMateDatePicker
            display="inline"
            mode="date"
            onChange={handlePickerChange}
            value={pickerDate}
          />
          <Pressable
            onPress={() => {
              setShowPicker(false);
            }}
            style={({ pressed }) => [styles.calendarDoneButton, pressed && styles.pressed]}
          >
            <Text style={styles.calendarDoneText}>Done</Text>
          </Pressable>
        </View>
      ) : null}

      {Platform.OS === 'android' && showPicker ? (
        <MileMateDatePicker
          display="calendar"
          mode="date"
          onChange={handlePickerChange}
          value={pickerDate}
        />
      ) : null}
    </View>
  );
}

export function PlaceOrderSheet({
  isSaving,
  onClose,
  onSave,
  visible,
}: PlaceOrderSheetProps) {
  const [placedAt, setPlacedAt] = useState(formatStoreOrderDateString(new Date()));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPlacedAt(formatStoreOrderDateString(new Date()));
      setExpectedDeliveryDate('');
      setNote('');
      setError(null);
    }
  }, [visible]);

  const canSave =
    isValidStoreOrderDateString(placedAt) &&
    isValidStoreOrderDateString(expectedDeliveryDate) &&
    !isSaving;

  async function handleSave() {
    if (!canSave) {
      setError('Expected delivery date is required.');
      return;
    }

    setError(null);

    try {
      await onSave({
        expectedDeliveryDate,
        note: note.trim() || undefined,
        placedAt,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save order.');
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close log order sheet" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Log Order</Text>

          <DateField label="Order Placed" onChange={setPlacedAt} value={placedAt} />
          <ExpectedDeliveryDateField
            onChange={setExpectedDeliveryDate}
            value={expectedDeliveryDate}
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="Optional order note"
              style={styles.noteInput}
              value={note}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              disabled={isSaving}
              onPress={onClose}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!canSave}
              onPress={() => {
                void handleSave();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSave && styles.primaryButtonDisabled,
                pressed && canSave && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? 'Saving…' : 'Save Order'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 14,
    padding: 20,
    paddingBottom: 28,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  dateInput: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: AppColors.textPrimary,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInputInvalid: {
    borderColor: AppColors.red,
  },
  datePickerButton: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerPlaceholder: {
    color: AppColors.textMuted,
    fontSize: 16,
  },
  datePickerValue: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  calendarPopout: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    overflow: 'hidden',
    paddingBottom: 8,
    width: '100%',
  },
  calendarDoneButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: 12,
    minHeight: 36,
    paddingHorizontal: 8,
  },
  calendarDoneText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
  },
  datePreview: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  validationText: {
    color: AppColors.red,
    fontSize: 13,
  },
  noteInput: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  errorText: {
    color: AppColors.red,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: AppSpacing.buttonRadius,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: AppSpacing.buttonRadius,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
