import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { SavedLocation } from '@/types/saved-location';

type MyLocationsSettingsProps = {
  isLoading: boolean;
  locations: SavedLocation[];
  onAddLocation: (input: {
    label: string;
    address: string;
  }) => Promise<unknown>;
  onDeleteLocation: (locationId: string) => Promise<void>;
  onEditLocation: (
    locationId: string,
    input: {
      label: string;
      address: string;
    },
  ) => Promise<unknown>;
};

export function MyLocationsSettings({
  isLoading,
  locations,
  onAddLocation,
  onDeleteLocation,
  onEditLocation,
}: MyLocationsSettingsProps) {
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAddress, setEditAddress] = useState('');

  async function handleAddLocation() {
    const trimmedLabel = label.trim();
    const trimmedAddress = address.trim();

    if (!trimmedLabel || !trimmedAddress) {
      Alert.alert('Add a label and address', 'Both fields are required to save a location.');
      return;
    }

    setIsSaving(true);

    try {
      await onAddLocation({
        label: trimmedLabel,
        address: trimmedAddress,
      });
      setLabel('');
      setAddress('');
    } catch (error) {
      console.error('[MyLocationsSettings] add failed:', error);
      Alert.alert('Could not save location', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function beginEdit(location: SavedLocation) {
    setEditingId(location.id);
    setEditLabel(location.label);
    setEditAddress(location.address);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel('');
    setEditAddress('');
  }

  async function handleSaveEdit(locationId: string) {
    const trimmedLabel = editLabel.trim();
    const trimmedAddress = editAddress.trim();

    if (!trimmedLabel || !trimmedAddress) {
      Alert.alert('Edit location', 'Both label and address are required.');
      return;
    }

    setIsSaving(true);

    try {
      await onEditLocation(locationId, {
        label: trimmedLabel,
        address: trimmedAddress,
      });
      cancelEdit();
    } catch (error) {
      console.error('[MyLocationsSettings] edit failed:', error);
      Alert.alert('Could not update location', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Saved places you can reuse when setting up today&apos;s route. You can
        still enter any address on Today without saving it here.
      </Text>

      {isLoading ? (
        <ActivityIndicator color={AppColors.blue} size="small" />
      ) : locations.length === 0 ? (
        <Text style={styles.emptyText}>No saved locations yet.</Text>
      ) : (
        locations.map((location) => (
          <View key={location.id} style={styles.locationRow}>
            {editingId === location.id ? (
              <View style={styles.editForm}>
                <TextInput
                  editable={!isSaving}
                  onChangeText={setEditLabel}
                  style={styles.input}
                  value={editLabel}
                />
                <TextInput
                  editable={!isSaving}
                  multiline
                  onChangeText={setEditAddress}
                  style={[styles.input, styles.addressInput]}
                  value={editAddress}
                />
                <View style={styles.editActions}>
                  <Pressable accessibilityRole="button" onPress={cancelEdit}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={() => {
                      void handleSaveEdit(location.id);
                    }}
                  >
                    <Text style={styles.saveText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.locationCopy}>
                  <Text style={styles.locationLabel}>{location.label}</Text>
                  <Text style={styles.locationAddress}>{location.address}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      beginEdit(location);
                    }}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      Alert.alert(
                        `Delete ${location.label}?`,
                        'This removes the saved location from Settings.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              void onDeleteLocation(location.id);
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ))
      )}

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Add Location</Text>
        <TextInput
          editable={!isSaving}
          onChangeText={setLabel}
          placeholder="Home"
          style={styles.input}
          value={label}
        />
        <TextInput
          editable={!isSaving}
          multiline
          onChangeText={setAddress}
          placeholder="123 Main St, Springfield, IL"
          style={[styles.input, styles.addressInput]}
          value={address}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => {
            void handleAddLocation();
          }}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
            isSaving && styles.disabled,
          ]}
        >
          <Text style={styles.addButtonText}>
            {isSaving ? 'Saving…' : 'Save Location'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 16,
  },
  description: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    backgroundColor: AppColors.background,
    borderColor: AppColors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: AppColors.startButton,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: AppColors.textMuted,
    fontSize: 14,
  },
  locationRow: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  locationCopy: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  locationAddress: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  editText: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    color: AppColors.red,
    fontSize: 14,
    fontWeight: '600',
  },
  editForm: {
    gap: 10,
    width: '100%',
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'flex-end',
  },
  cancelText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveText: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
