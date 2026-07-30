import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppColors, AppShadows, AppSpacing, AppTypography } from '@/components/shared/app-theme';
import { EmptyState } from '@/components/redesign/primitives/empty-state';
import { LoadingState } from '@/components/redesign/primitives/loading-state';
import { PrimaryButton } from '@/components/redesign/primitives/primary-button';
import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import {
  ADDRESS_AUTOCOMPLETE_MIN_CHARS,
  fetchAddressSuggestions,
  type AddressSuggestion,
} from '@/services/address-autocomplete';
import {
  reverseGeocodeForConfirmation,
  type GeocodedAddressConfirmation,
} from '@/services/address-geocoding';
import {
  requestForegroundPermission,
  getOneTimeLocationFix,
} from '@/services/location';
import { getStores } from '@/services/stores';
import type { RouteLocation } from '@/types/route-location';
import { routeLocationFromConfirmation } from '@/services/route-planning';
import type { Store } from '@/types/store';
import { formatStoreAddress } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { searchStores } from '@/utils/search-stores';

type AddStopModalPurpose = 'stop' | 'start' | 'end';

type AddStopModalProps = {
  currentRouteStoreIds?: string[];
  onAddExistingStore?: (storeIds: string[]) => Promise<void>;
  onAddStop: (location: RouteLocation) => Promise<void>;
  onClose: () => void;
  purpose?: AddStopModalPurpose;
  visible: boolean;
};

type Step = 'choose' | 'existing' | 'enter';

const ADDRESS_SEARCH_DEBOUNCE_MS = 350;

const PURPOSE_COPY: Record<
  AddStopModalPurpose,
  { confirmTitle: string; enterTitle: string; primaryAction: string }
> = {
  stop: {
    enterTitle: 'Add Stop',
    confirmTitle: 'Confirm Stop',
    primaryAction: 'Add Stop',
  },
  start: {
    enterTitle: 'Set Start Location',
    confirmTitle: 'Confirm Start',
    primaryAction: 'Continue',
  },
  end: {
    enterTitle: 'Set End Location',
    confirmTitle: 'Confirm End',
    primaryAction: 'Continue',
  },
};

function initialStep(purpose: AddStopModalPurpose): Step {
  return purpose === 'stop' ? 'choose' : 'enter';
}

export function AddStopModal({
  currentRouteStoreIds = [],
  onAddExistingStore,
  onAddStop,
  onClose,
  purpose = 'stop',
  visible,
}: AddStopModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [step, setStep] = useState<Step>(() => initialStep(purpose));
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const addressSearchRequestRef = useRef(0);
  const addressInputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [confirmation, setConfirmation] = useState<GeocodedAddressConfirmation | null>(
    null,
  );

  const showStopChooser = purpose === 'stop';

  useEffect(() => {
    if (!visible || !showStopChooser) {
      return;
    }

    void getStores().then(setStores);
  }, [showStopChooser, visible]);

  useEffect(() => {
    if (!visible || step !== 'enter') {
      return;
    }

    const trimmed = addressQuery.trim();

    if (trimmed.length < ADDRESS_AUTOCOMPLETE_MIN_CHARS) {
      setAddressSuggestions([]);
      setAddressSearchError(null);
      setIsSearchingAddresses(false);
      return;
    }

    const requestId = addressSearchRequestRef.current + 1;
    addressSearchRequestRef.current = requestId;

    const debounceTimer = setTimeout(() => {
      setIsSearchingAddresses(true);
      setAddressSearchError(null);

      void fetchAddressSuggestions(trimmed).then((result) => {
        if (addressSearchRequestRef.current !== requestId) {
          return;
        }

        setIsSearchingAddresses(false);

        if (result.status === 'error') {
          setAddressSuggestions([]);
          setAddressSearchError(result.message);
          return;
        }

        if (result.status === 'empty') {
          setAddressSuggestions([]);
          setAddressSearchError(null);
          return;
        }

        setAddressSuggestions(result.suggestions);
        setAddressSearchError(null);
      });
    }, ADDRESS_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [addressQuery, step, visible]);

  useEffect(() => {
    if (!visible || step !== 'enter') {
      return;
    }

    const focusTimer = setTimeout(() => {
      addressInputRef.current?.focus();
    }, 280);

    return () => {
      clearTimeout(focusTimer);
    };
  }, [step, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const filteredStores = useMemo(
    () => searchStores(stores, searchQuery).slice(0, 20),
    [searchQuery, stores],
  );

  const routeStoreIdSet = useMemo(
    () => new Set(currentRouteStoreIds),
    [currentRouteStoreIds],
  );

  const selectedStoreIdSet = useMemo(
    () => new Set(selectedStoreIds),
    [selectedStoreIds],
  );

  function resetAddressSearchState() {
    setAddressQuery('');
    setAddressSuggestions([]);
    setAddressSearchError(null);
    setIsSearchingAddresses(false);
    setSelectedSuggestionId(null);
    setConfirmation(null);
    addressSearchRequestRef.current += 1;
  }

  function resetState() {
    setStep(initialStep(purpose));
    resetAddressSearchState();
    setSearchQuery('');
    setSelectedStoreIds([]);
    setError(null);
    setIsWorking(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      addressSearchRequestRef.current += 1;
      return;
    }

    setStep(initialStep(purpose));
  }, [purpose, visible]);

  function handleBack() {
    setError(null);

    if (step === 'enter' || step === 'existing') {
      setStep('choose');
      resetAddressSearchState();
      setSearchQuery('');
      setSelectedStoreIds([]);
      setError(null);
    }
  }

  function toggleStoreSelection(storeId: string) {
    if (routeStoreIdSet.has(storeId) || isWorking) {
      return;
    }

    setSelectedStoreIds((current) =>
      current.includes(storeId)
        ? current.filter((id) => id !== storeId)
        : [...current, storeId],
    );
    setError(null);
  }

  async function handleAddSelectedStores() {
    if (!onAddExistingStore || isWorking || selectedStoreIds.length === 0) {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      await onAddExistingStore(selectedStoreIds);
      handleClose();
    } catch (selectError) {
      console.error('[AddStopModal] add existing stores failed:', selectError);
      setError(
        selectError instanceof Error
          ? selectError.message
          : 'Could not add these stops. Try again.',
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleUseCurrentLocation() {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setError(null);
    setAddressSearchError(null);

    try {
      const permission = await requestForegroundPermission();

      if (!permission.granted) {
        setError('Location access is required to use your current location.');
        return;
      }

      const fix = await getOneTimeLocationFix();

      if (!fix.ok) {
        setError("We couldn't verify this address right now. Check your connection and try again.");
        return;
      }

      const confirmed = await reverseGeocodeForConfirmation({
        latitude: fix.update.latitude,
        longitude: fix.update.longitude,
        fallbackAddress: 'Current Location',
      });

      setConfirmation(confirmed);
      setSelectedSuggestionId(null);
      await submitConfirmedLocation(confirmed, 'current-location');
    } catch (locationError) {
      console.error('[AddStopModal] current location failed:', locationError);
      setError('Could not add this stop. Try again.');
    } finally {
      setIsWorking(false);
    }
  }

  async function submitConfirmedLocation(
    confirmed: GeocodedAddressConfirmation,
    source?: 'manual' | 'current-location',
  ) {
    const location = routeLocationFromConfirmation({
      name: confirmed.name,
      formattedAddress: confirmed.formattedAddress,
      latitude: confirmed.latitude,
      longitude: confirmed.longitude,
      source: source ?? (confirmed.name ? 'manual' : 'current-location'),
    });

    await onAddStop(location);
    handleClose();
  }

  async function handleConfirm() {
    if (!confirmation || isWorking) {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      await submitConfirmedLocation(confirmation, 'manual');
    } catch (confirmError) {
      console.error('[AddStopModal] add stop failed:', confirmError);
      setError('Could not add this stop. Try again.');
    } finally {
      setIsWorking(false);
    }
  }

  function handleSelectAddressSuggestion(suggestion: AddressSuggestion) {
    setSelectedSuggestionId(suggestion.id);
    setConfirmation(suggestion.confirmation);
    setError(null);
    setAddressSearchError(null);
  }

  function handleAddressQueryChange(value: string) {
    setAddressQuery(value);
    setError(null);
    setAddressSearchError(null);

    if (selectedSuggestionId !== null || confirmation !== null) {
      setSelectedSuggestionId(null);
      setConfirmation(null);
    }
  }

  const copy = PURPOSE_COPY[purpose];
  const canSubmitAddress = confirmation !== null && !isWorking;
  const showBackButton = showStopChooser && (step === 'existing' || step === 'enter');
  const sheetTopInset = insets.top + 12;
  const availableSheetHeight = windowHeight - keyboardHeight - sheetTopInset;
  const sheetMaxHeight = Math.min(windowHeight * 0.88, availableSheetHeight);
  const isKeyboardVisible = keyboardHeight > 0;
  const selectedCount = selectedStoreIds.length;
  const canAddSelectedStores = selectedCount > 0 && !isWorking;
  const addLocationsLabel =
    selectedCount === 1 ? 'Add Location' : 'Add Locations';
  const selectionSummaryLabel =
    selectedCount === 1
      ? '1 location selected'
      : `${selectedCount} locations selected`;

  const enterActions = (
    <>
      <PrimaryButton
        disabled={!canSubmitAddress}
        label={isWorking ? 'Adding stop…' : copy.primaryAction}
        loading={isWorking}
        onPress={() => {
          void handleConfirm();
        }}
      />
      <Pressable
        accessibilityRole="button"
        disabled={isWorking}
        onPress={() => {
          void handleUseCurrentLocation();
        }}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryButtonText}>
          {isWorking ? 'Finding your location…' : 'Use Current Location'}
        </Text>
      </Pressable>
    </>
  );

  const existingActions = (
    <>
      <Text style={styles.selectionSummary}>{selectionSummaryLabel}</Text>
      <PrimaryButton
        disabled={!canAddSelectedStores}
        label={isWorking ? 'Adding locations…' : addLocationsLabel}
        loading={isWorking}
        onPress={() => {
          void handleAddSelectedStores();
        }}
      />
    </>
  );

  function renderChooseStep() {
    return (
      <>
        <Text style={styles.helperText}>How would you like to add this stop?</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            setStep('existing');
          }}
          style={({ pressed }) => [styles.choiceCardWrap, pressed && styles.pressed]}
        >
          <SurfaceCard style={styles.choiceCard}>
            <View style={[styles.choiceIconWrap, { backgroundColor: AppColors.blueSoft }]}>
              <Ionicons color={AppColors.blue} name="storefront-outline" size={24} />
            </View>
            <View style={styles.choiceCopy}>
              <Text style={styles.choiceTitle}>Existing Location</Text>
              <Text style={styles.choiceDescription}>
                Search stores already saved in MileMate.
              </Text>
            </View>
            <Ionicons color={AppColors.blue} name="chevron-forward" size={20} />
          </SurfaceCard>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            resetAddressSearchState();
            setStep('enter');
          }}
          style={({ pressed }) => [styles.choiceCardWrap, pressed && styles.pressed]}
        >
          <SurfaceCard style={styles.choiceCard}>
            <View style={[styles.choiceIconWrap, { backgroundColor: AppColors.greenSoft }]}>
              <Ionicons color={AppColors.green} name="location-outline" size={24} />
            </View>
            <View style={styles.choiceCopy}>
              <Text style={styles.choiceTitle}>New Address</Text>
              <Text style={styles.choiceDescription}>
                Enter an address or use your current location.
              </Text>
            </View>
            <Ionicons color={AppColors.green} name="chevron-forward" size={20} />
          </SurfaceCard>
        </Pressable>
      </>
    );
  }

  function renderExistingStep() {
    return (
      <>
        <Text style={styles.label}>Search stores</Text>
        <View style={styles.searchFieldWrap}>
          <Ionicons color={AppColors.textSecondary} name="search" size={20} />
          <TextInput
            accessibilityLabel="Search stores and addresses"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isWorking}
            onChangeText={(value) => {
              setSearchQuery(value);
              setError(null);
            }}
            placeholder="Search by name, number, or address"
            placeholderTextColor={AppColors.textMuted}
            style={styles.searchInputInner}
            value={searchQuery}
          />
        </View>
        {filteredStores.length > 0 ? (
          <View style={styles.results}>
            {filteredStores.map((store) => {
              const alreadyAdded = routeStoreIdSet.has(store.id);
              const isSelected = selectedStoreIdSet.has(store.id);

              return (
                <Pressable
                  accessibilityLabel={`${getStoreDisplayName(store)}, ${formatStoreAddress(store)}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: alreadyAdded }}
                  disabled={isWorking || alreadyAdded}
                  key={store.id}
                  onPress={() => {
                    toggleStoreSelection(store.id);
                  }}
                  style={({ pressed }) => [
                    styles.resultRow,
                    isSelected && styles.resultRowSelected,
                    alreadyAdded && styles.resultRowDisabled,
                    pressed && !alreadyAdded && styles.pressed,
                  ]}
                >
                  <View style={styles.resultRowContent}>
                    <Text style={styles.resultTitle}>{getStoreDisplayName(store)}</Text>
                    <Text style={styles.resultAddress}>{formatStoreAddress(store)}</Text>
                    {alreadyAdded ? (
                      <Text style={styles.resultMeta}>Already on route</Text>
                    ) : null}
                  </View>
                  {!alreadyAdded ? (
                    <View
                      style={[
                        styles.selectionIndicator,
                        isSelected && styles.selectionIndicatorSelected,
                      ]}
                    >
                      {isSelected ? (
                        <Ionicons color="#FFFFFF" name="checkmark" size={16} />
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : searchQuery.trim().length > 0 ? (
          <EmptyState
            message="Try a different name, store number, or address."
            title="No matching stores"
          />
        ) : (
          <EmptyState
            message="Start typing to search your saved stores."
            title="Search stores"
          />
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </>
    );
  }

  function renderEnterStep() {
    const trimmedQuery = addressQuery.trim();
    const showMinCharsHint =
      trimmedQuery.length > 0 && trimmedQuery.length < ADDRESS_AUTOCOMPLETE_MIN_CHARS;

    return (
      <>
        <View style={styles.searchFieldWrap}>
          <Ionicons color={AppColors.textSecondary} name="search" size={20} />
          <TextInput
            accessibilityLabel="Search for an address"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isWorking}
            onChangeText={handleAddressQueryChange}
            placeholder="Search for an address"
            placeholderTextColor={AppColors.textMuted}
            ref={addressInputRef}
            returnKeyType="search"
            style={styles.searchInputInner}
            value={addressQuery}
          />
        </View>

        {isSearchingAddresses ? (
          <LoadingState message="Searching addresses…" />
        ) : null}

        {showMinCharsHint ? (
          <Text style={styles.helperText}>
            Type at least {ADDRESS_AUTOCOMPLETE_MIN_CHARS} characters to search.
          </Text>
        ) : null}

        {addressSearchError ? <Text style={styles.error}>{addressSearchError}</Text> : null}

        {addressSuggestions.length > 0 ? (
          <View style={styles.results}>
            {addressSuggestions.map((suggestion) => {
              const isSelected = selectedSuggestionId === suggestion.id;

              return (
                <Pressable
                  accessibilityLabel={`${suggestion.primaryLine}, ${suggestion.secondaryLine}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  disabled={isWorking}
                  key={suggestion.id}
                  onPress={() => {
                    handleSelectAddressSuggestion(suggestion);
                  }}
                  style={({ pressed }) => [
                    styles.resultRow,
                    isSelected && styles.resultRowSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.resultRowContent}>
                    <Text style={styles.resultTitle}>{suggestion.primaryLine}</Text>
                    {suggestion.secondaryLine ? (
                      <Text style={styles.resultAddress}>{suggestion.secondaryLine}</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.selectionIndicator,
                      isSelected && styles.selectionIndicatorSelected,
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons color="#FFFFFF" name="checkmark" size={16} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : trimmedQuery.length >= ADDRESS_AUTOCOMPLETE_MIN_CHARS &&
          !isSearchingAddresses &&
          !addressSearchError ? (
          <EmptyState
            message="Try a more specific street, city, and state."
            title="No matching addresses"
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </>
    );
  }

  function sheetHeaderTitle(): string {
    if (step === 'choose') {
      return copy.enterTitle;
    }

    if (step === 'existing') {
      return 'Existing Location';
    }

    if (step === 'enter') {
      return showStopChooser ? 'New Address' : copy.enterTitle;
    }

    return copy.enterTitle;
  }

  function renderBottomSheet() {
    return (
      <View style={[styles.backdropBottom, { paddingBottom: keyboardHeight }]}>
        <Pressable
          accessibilityLabel={`Close ${copy.enterTitle.toLowerCase()}`}
          onPress={handleClose}
          style={styles.backdropPress}
        />
        <View style={[styles.sheet, { maxHeight: sheetMaxHeight }]}>
          <View style={styles.grabberTrack}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.sheetHeaderRow}>
            {showBackButton ? (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={handleBack}>
                <Ionicons color={AppColors.blue} name="chevron-back" size={26} />
              </Pressable>
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <Text accessibilityRole="header" style={styles.sheetHeaderTitle}>
              {sheetHeaderTitle()}
            </Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Ionicons color={AppColors.textSecondary} name="close-circle" size={28} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.sheetScroll}
          >
            {step === 'choose' ? renderChooseStep() : null}
            {step === 'existing' ? renderExistingStep() : null}
            {step === 'enter' ? renderEnterStep() : null}
          </ScrollView>

          {step === 'enter' || step === 'existing' ? (
            <View
              style={[
                styles.footer,
                { paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 16) },
              ]}
            >
              {step === 'existing' ? existingActions : enterActions}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      {renderBottomSheet()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropBottom: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: AppColors.card,
    borderTopColor: AppColors.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...AppShadows.card,
  },
  grabberTrack: {
    alignItems: 'center',
    paddingBottom: 4,
    paddingTop: 10,
  },
  grabber: {
    backgroundColor: AppColors.textMuted,
    borderRadius: 3,
    height: 5,
    opacity: 0.55,
    width: 40,
  },
  sheetHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: AppSpacing.screenPaddingMin,
    paddingTop: 14,
  },
  sheetHeaderTitle: {
    ...AppTypography.bodyStrong,
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 18,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 26,
  },
  closeButton: {
    alignItems: 'center',
    height: AppSpacing.minTouchTarget,
    justifyContent: 'center',
    width: AppSpacing.minTouchTarget,
  },
  cancelButton: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  sheetScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  sheetContent: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  footer: {
    borderTopColor: AppColors.border,
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    ...AppTypography.sectionTitle,
    color: AppColors.textPrimary,
    fontSize: 20,
  },
  helperText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },
  choiceCardWrap: {
    width: '100%',
  },
  choiceCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  choiceIconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  choiceCopy: {
    flex: 1,
    gap: 4,
  },
  choiceTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  choiceDescription: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  searchFieldWrap: {
    alignItems: 'center',
    backgroundColor: AppColors.backgroundElevated,
    borderColor: AppColors.blue,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInputInner: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  confirmCard: {
    gap: 6,
  },
  results: {
    gap: 8,
  },
  resultRow: {
    alignItems: 'center',
    backgroundColor: AppColors.backgroundElevated,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  resultRowSelected: {
    borderColor: AppColors.blue,
  },
  resultRowContent: {
    flex: 1,
    gap: 2,
  },
  resultRowDisabled: {
    opacity: 0.55,
  },
  selectionIndicator: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  selectionIndicatorSelected: {
    backgroundColor: AppColors.blue,
    borderColor: AppColors.blue,
  },
  selectionSummary: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  resultAddress: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  resultMeta: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyResults: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: AppColors.backgroundElevated,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    color: AppColors.textPrimary,
    fontSize: 16,
    minHeight: 96,
    padding: 14,
    textAlignVertical: 'top',
  },
  inputCompact: {
    minHeight: 64,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.startButton,
    borderRadius: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmStreet: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  confirmCity: {
    color: AppColors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  editText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: AppColors.red,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.85,
  },
});
