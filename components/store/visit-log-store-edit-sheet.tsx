import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MileMateTimePicker } from '@/components/shared/milemate-time-picker';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import {
  updateStoreFromVisitLogEditor,
  visitLogStoreEditorInputFromStore,
} from '@/services/update-store-from-visit-log-editor';
import type { Store } from '@/types/store';
import type { ManagerPhoneType } from '@/types/manager-phone-type';
import { MANAGER_PHONE_TYPE_LABELS } from '@/types/manager-phone-type';
import type { StoreReceivingRestrictionKind } from '@/types/store-receiving-restriction';
import {
  dateToMinutesOfDay,
  minutesOfDayToDate,
  normalizeStoreReceivingRestriction,
  storeReceivingRestrictionKindLabel,
  validateStoreReceivingRestriction,
} from '@/utils/store-receiving-restriction';

type VisitLogStoreEditSheetProps = {
  onClose: () => void;
  onSaved: (store: Store) => void;
  store: Store | null;
  visible: boolean;
};

const RESTRICTION_KINDS: StoreReceivingRestrictionKind[] = [
  'none',
  'before',
  'after',
  'between',
];

export function VisitLogStoreEditSheet({
  onClose,
  onSaved,
  store,
  visible,
}: VisitLogStoreEditSheetProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [storeNumber, setStoreNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerPhoneType, setManagerPhoneType] = useState<ManagerPhoneType | null>(null);
  const [restrictionKind, setRestrictionKind] =
    useState<StoreReceivingRestrictionKind>('none');
  const [timeMinutes, setTimeMinutes] = useState(14 * 60);
  const [startTimeMinutes, setStartTimeMinutes] = useState(8 * 60);
  const [endTimeMinutes, setEndTimeMinutes] = useState(13 * 60);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible || !store) {
      return;
    }

    const input = visitLogStoreEditorInputFromStore(store);
    setName(input.name);
    setStoreNumber(input.storeNumber ?? '');
    setAddressLine1(input.addressLine1);
    setAddressLine2(input.addressLine2 ?? '');
    setCity(input.city);
    setState(input.state);
    setPostalCode(input.postalCode);
    setManagerName(input.managerName ?? '');
    setManagerPhone(input.managerPhone ?? '');
    setManagerPhoneType(input.managerPhoneType ?? null);

    const restriction = normalizeStoreReceivingRestriction(input.receivingRestriction);
    setRestrictionKind(restriction.type === 'none' ? 'none' : restriction.type);

    if (restriction.type === 'before') {
      setTimeMinutes(restriction.timeMinutes);
    } else if (restriction.type === 'after') {
      setTimeMinutes(restriction.timeMinutes);
    } else if (restriction.type === 'between') {
      setStartTimeMinutes(restriction.startTimeMinutes);
      setEndTimeMinutes(restriction.endTimeMinutes);
    }

    setError(null);
    setIsSaving(false);
  }, [store, visible]);

  function buildRestrictionDraft() {
    if (restrictionKind === 'none') {
      return { type: 'none' as const };
    }

    if (restrictionKind === 'before') {
      return { type: 'before' as const, timeMinutes };
    }

    if (restrictionKind === 'after') {
      return { type: 'after' as const, timeMinutes };
    }

    return {
      type: 'between' as const,
      startTimeMinutes,
      endTimeMinutes,
    };
  }

  async function handleSave() {
    if (!store || isSaving) {
      return;
    }

    const receivingRestriction = normalizeStoreReceivingRestriction(buildRestrictionDraft());
    const validation = validateStoreReceivingRestriction(receivingRestriction);

    if (validation) {
      setError(validation);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await updateStoreFromVisitLogEditor(store.id, {
        name,
        storeNumber,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        managerName,
        managerPhone,
        managerPhoneType,
        receivingRestriction,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved(result.store);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  const inlineValidation = validateStoreReceivingRestriction(
    normalizeStoreReceivingRestriction(buildRestrictionDraft()),
  );

  const showManagerPhoneField =
    managerName.trim().length > 0 || managerPhone.trim().length > 0;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close editor" onPress={onClose} style={styles.backdropPress} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            <Text style={styles.title}>Edit Store Info</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Store name</Text>
            <TextInput editable={!isSaving} onChangeText={setName} style={styles.input} value={name} />
            <Text style={styles.label}>Store number (optional)</Text>
            <TextInput
              editable={!isSaving}
              onChangeText={setStoreNumber}
              style={styles.input}
              value={storeNumber}
            />
            <Text style={styles.label}>Street address</Text>
            <TextInput
              editable={!isSaving}
              onChangeText={setAddressLine1}
              style={styles.input}
              value={addressLine1}
            />
            <Text style={styles.label}>Address line 2 (optional)</Text>
            <TextInput
              editable={!isSaving}
              onChangeText={setAddressLine2}
              style={styles.input}
              value={addressLine2}
            />
            <Text style={styles.label}>City</Text>
            <TextInput editable={!isSaving} onChangeText={setCity} style={styles.input} value={city} />
            <Text style={styles.label}>State</Text>
            <TextInput editable={!isSaving} onChangeText={setState} style={styles.input} value={state} />
            <Text style={styles.label}>ZIP</Text>
            <TextInput
              editable={!isSaving}
              onChangeText={setPostalCode}
              style={styles.input}
              value={postalCode}
            />

            <Text style={styles.sectionLabel}>Contact</Text>
            <Text style={styles.label}>Manager name (optional)</Text>
            <TextInput
              autoCapitalize="words"
              editable={!isSaving}
              onChangeText={setManagerName}
              placeholder="Not added"
              placeholderTextColor={AppColors.textMuted}
              style={styles.input}
              value={managerName}
            />
            {showManagerPhoneField ? (
              <>
                <Text style={styles.label}>Manager phone (optional)</Text>
                <TextInput
                  editable={!isSaving}
                  keyboardType="phone-pad"
                  onChangeText={(value) => {
                    const hadPhone = managerPhone.trim().length > 0;
                    setManagerPhone(value);

                    if (!hadPhone && value.trim().length > 0 && managerPhoneType === null) {
                      setManagerPhoneType('mobile');
                    }

                    if (value.trim().length === 0) {
                      setManagerPhoneType(null);
                    }
                  }}
                  placeholder="Phone number"
                  placeholderTextColor={AppColors.textMuted}
                  style={styles.input}
                  textContentType="telephoneNumber"
                  value={managerPhone}
                />
                <Text style={styles.label}>Phone type</Text>
                <View style={styles.kindRow}>
                  {(['mobile', 'other'] as const).map((type) => {
                    const selected = managerPhoneType === type;

                    return (
                      <Pressable
                        key={type}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={managerPhone.trim().length === 0}
                        onPress={() => {
                          setManagerPhoneType(type);
                          setError(null);
                        }}
                        style={({ pressed }) => [
                          styles.kindChip,
                          selected && styles.kindChipSelected,
                          managerPhone.trim().length === 0 && styles.kindChipDisabled,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.kindChipText,
                            selected && styles.kindChipTextSelected,
                          ]}
                        >
                          {MANAGER_PHONE_TYPE_LABELS[type]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Receiving restriction</Text>
            <View style={styles.kindRow}>
              {RESTRICTION_KINDS.map((kind) => {
                const selected = restrictionKind === kind;

                return (
                  <Pressable
                    key={kind}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setRestrictionKind(kind);
                      setError(null);
                    }}
                    style={({ pressed }) => [
                      styles.kindChip,
                      selected && styles.kindChipSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.kindChipText, selected && styles.kindChipTextSelected]}>
                      {storeReceivingRestrictionKindLabel(kind)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {restrictionKind === 'before' || restrictionKind === 'after' ? (
              <View style={styles.timePickerBlock}>
                <Text style={styles.label}>
                  {restrictionKind === 'before' ? 'Arrive before' : 'Arrive after'}
                </Text>
                <MileMateTimePicker
                  onChange={(_event, date) => {
                    if (date) {
                      setTimeMinutes(dateToMinutesOfDay(date));
                    }
                  }}
                  value={minutesOfDayToDate(timeMinutes)}
                />
              </View>
            ) : null}

            {restrictionKind === 'between' ? (
              <View style={styles.timePickerBlock}>
                <Text style={styles.label}>Start time</Text>
                <MileMateTimePicker
                  onChange={(_event, date) => {
                    if (date) {
                      setStartTimeMinutes(dateToMinutesOfDay(date));
                    }
                  }}
                  value={minutesOfDayToDate(startTimeMinutes)}
                />
                <Text style={styles.label}>End time</Text>
                <MileMateTimePicker
                  onChange={(_event, date) => {
                    if (date) {
                      setEndTimeMinutes(dateToMinutesOfDay(date));
                    }
                  }}
                  value={minutesOfDayToDate(endTimeMinutes)}
                />
                {inlineValidation ? (
                  <Text style={styles.validationText}>{inlineValidation}</Text>
                ) : null}
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => {
              void handleSave();
            }}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save</Text>
            )}
          </Pressable>
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
    backgroundColor: MileMateTokens.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: MileMateTokens.cardBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 28,
  },
  closeText: {
    color: AppColors.textSecondary,
    fontSize: 20,
    fontWeight: '600',
    width: 28,
  },
  content: {
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  label: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  kindChip: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  kindChipSelected: {
    backgroundColor: `${AppColors.blue}18`,
    borderColor: AppColors.blue,
  },
  kindChipDisabled: {
    opacity: 0.45,
  },
  kindChipText: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  kindChipTextSelected: {
    color: AppColors.blue,
    fontWeight: '700',
  },
  timePickerBlock: {
    gap: 4,
    marginTop: 4,
  },
  validationText: {
    color: AppColors.red,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  error: {
    color: AppColors.red,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 14,
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
