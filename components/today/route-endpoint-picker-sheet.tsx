import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import {
  createCurrentLocationEndpoint,
  createCustomAddressEndpoint,
  createSavedLocationEndpoint,
  CURRENT_LOCATION_LABEL,
  type RouteEndpoint,
} from '@/types/route-endpoint';
import type { SavedLocation } from '@/types/saved-location';
import { endpointsMatch } from '@/utils/route-endpoints';

type CustomAddressEditorSheetProps = {
  initialLabel?: string;
  initialAddress?: string;
  onClose: () => void;
  onConfirm: (endpoint: RouteEndpoint) => void;
  onSaveToMyLocations?: (input: {
    label: string;
    address: string;
  }) => Promise<SavedLocation>;
  onSavedToMyLocations?: (savedLocationId: string) => void;
  title: string;
  visible: boolean;
};

export function CustomAddressEditorSheet({
  initialAddress = '',
  initialLabel = '',
  onClose,
  onConfirm,
  onSaveToMyLocations,
  onSavedToMyLocations,
  title,
  visible,
}: CustomAddressEditorSheetProps) {
  const [label, setLabel] = useState(initialLabel);
  const [address, setAddress] = useState(initialAddress);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleUseAddress() {
    const trimmedLabel = label.trim();
    const trimmedAddress = address.trim();

    if (!trimmedLabel || !trimmedAddress) {
      setError('Enter a label and address to continue.');
      return;
    }

    setError(null);
    onConfirm(
      createCustomAddressEndpoint({
        label: trimmedLabel,
        address: trimmedAddress,
      }),
    );
  }

  async function handleSaveToMyLocations() {
    if (!onSaveToMyLocations || !onSavedToMyLocations) {
      return;
    }

    const trimmedLabel = label.trim();
    const trimmedAddress = address.trim();

    if (!trimmedLabel || !trimmedAddress) {
      setError('Enter a label and address before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const saved = await onSaveToMyLocations({
        label: trimmedLabel,
        address: trimmedAddress,
      });
      onSavedToMyLocations(saved.id);
    } catch (saveError) {
      console.error('[CustomAddressEditorSheet] save failed:', saveError);
      setError('Could not save to My Locations. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close address editor" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={handleUseAddress}>
              <Text style={styles.doneText}>Use</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.description}>
              Use this address for today without saving it, or save it to My Locations.
            </Text>
            <TextInput
              accessibilityLabel="Address label"
              editable={!isSaving}
              onChangeText={setLabel}
              placeholder="Home"
              style={styles.input}
              value={label}
            />
            <TextInput
              accessibilityLabel="Street address"
              editable={!isSaving}
              multiline
              onChangeText={setAddress}
              placeholder="123 Main St, Springfield, IL"
              style={[styles.input, styles.addressInput]}
              value={address}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {onSaveToMyLocations ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => {
                  void handleSaveToMyLocations();
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {isSaving ? 'Saving…' : 'Save to My Locations'}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type RouteEndpointPickerSheetProps = {
  currentEndpoint: RouteEndpoint | null;
  myLocations: SavedLocation[];
  onClose: () => void;
  onSaveToMyLocations?: (input: {
    label: string;
    address: string;
  }) => Promise<SavedLocation>;
  onSelect: (endpoint: RouteEndpoint) => void;
  title: string;
  visible: boolean;
};

export function RouteEndpointPickerSheet({
  currentEndpoint,
  myLocations,
  onClose,
  onSaveToMyLocations,
  onSelect,
  title,
  visible,
}: RouteEndpointPickerSheetProps) {
  const [showAddressEditor, setShowAddressEditor] = useState(false);

  function selectCurrentLocation() {
    onSelect(createCurrentLocationEndpoint());
    onClose();
  }

  function selectSavedLocation(location: SavedLocation) {
    onSelect(createSavedLocationEndpoint(location.id));
    onClose();
  }

  function handleCustomAddress(endpoint: RouteEndpoint) {
    onSelect(endpoint);
    setShowAddressEditor(false);
    onClose();
  }

  function handleSavedFromEditor(savedLocationId: string) {
    onSelect(createSavedLocationEndpoint(savedLocationId));
    setShowAddressEditor(false);
    onClose();
  }

  const currentLocationSelected =
    currentEndpoint?.type === 'current_location' ||
    (currentEndpoint !== null && endpointsMatch(currentEndpoint, createCurrentLocationEndpoint()));

  return (
    <>
      <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
        <View style={styles.backdrop}>
          <Pressable accessibilityLabel="Close location picker" onPress={onClose} style={styles.backdropPress} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Pressable accessibilityRole="button" onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.headerTitle}>{title}</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              <Pressable
                accessibilityLabel={`${CURRENT_LOCATION_LABEL}. MileMate uses your phone's live location when required.`}
                accessibilityRole="button"
                accessibilityState={{ selected: currentLocationSelected }}
                onPress={selectCurrentLocation}
                style={({ pressed }) => [
                  styles.optionRow,
                  currentLocationSelected && styles.optionRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionTitle}>{CURRENT_LOCATION_LABEL}</Text>
                <Text style={styles.optionDescription}>
                  MileMate will use your phone&apos;s live location when required.
                </Text>
              </Pressable>

              {myLocations.length > 0 ? (
                <View style={styles.savedSection}>
                  <Text style={styles.savedTitle}>My Locations</Text>
                  {myLocations.map((location) => {
                    const isSelected =
                      currentEndpoint?.type === 'saved_location' &&
                      currentEndpoint.savedLocationId === location.id;

                    return (
                      <Pressable
                        accessibilityLabel={`${location.label}, ${location.address}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={location.id}
                        onPress={() => {
                          selectSavedLocation(location);
                        }}
                        style={({ pressed }) => [
                          styles.savedRow,
                          isSelected && styles.optionRowSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.savedLabel}>{location.label}</Text>
                        <Text numberOfLines={2} style={styles.savedAddress}>
                          {location.address}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <Pressable
                accessibilityLabel="Enter address"
                accessibilityRole="button"
                onPress={() => {
                  setShowAddressEditor(true);
                }}
                style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
              >
                <Text style={styles.optionTitle}>Enter Address</Text>
                <Text style={styles.optionDescription}>
                  Use a one-time address without saving it first.
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomAddressEditorSheet
        onClose={() => {
          setShowAddressEditor(false);
        }}
        onConfirm={handleCustomAddress}
        onSaveToMyLocations={onSaveToMyLocations}
        onSavedToMyLocations={handleSavedFromEditor}
        title="Enter Address"
        visible={showAddressEditor && visible}
      />
    </>
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
    maxHeight: '88%',
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
  headerTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 48,
  },
  cancelText: {
    color: AppColors.textSecondary,
    fontSize: 16,
  },
  doneText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  description: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  optionRow: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  optionRowSelected: {
    borderColor: AppColors.blue,
  },
  optionTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  optionDescription: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  savedSection: {
    gap: 8,
  },
  savedTitle: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  savedRow: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 2,
    padding: 14,
  },
  savedLabel: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  savedAddress: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
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
  addressInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: AppColors.red,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
