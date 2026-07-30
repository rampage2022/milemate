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

import { AppColors } from '@/components/shared/app-theme';
import {
  planningStoreEditorInputFromStore,
  updateStoreFromPlanningEditor,
} from '@/services/update-store-from-planning';
import type { Store } from '@/types/store';

type PlanningStopEditorSheetProps = {
  onClose: () => void;
  onSaved: () => void;
  store: Store | null;
  visible: boolean;
};

export function PlanningStopEditorSheet({
  onClose,
  onSaved,
  store,
  visible,
}: PlanningStopEditorSheetProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [storeNumber, setStoreNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible || !store) {
      return;
    }

    const input = planningStoreEditorInputFromStore(store);
    setName(input.name);
    setStoreNumber(input.storeNumber ?? '');
    setAddressLine1(input.addressLine1);
    setAddressLine2(input.addressLine2 ?? '');
    setCity(input.city);
    setState(input.state);
    setPostalCode(input.postalCode);
    setError(null);
    setIsSaving(false);
  }, [store, visible]);

  async function handleSave() {
    if (!store || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await updateStoreFromPlanningEditor(store.id, {
        name,
        storeNumber,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved();
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close stop editor" onPress={onClose} style={styles.backdropPress} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            <Text style={styles.title}>Edit Stop</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Store name</Text>
            <TextInput
              editable={!isSaving}
              onChangeText={setName}
              style={styles.input}
              value={name}
            />
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
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: AppColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
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
  error: {
    color: AppColors.red,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.startButton,
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
