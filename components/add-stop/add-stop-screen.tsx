import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AddStopLayout } from '@/components/add-stop/add-stop-layout';
import { formatPlanningStopDisplay } from '@/components/coordinator/planning-address-display';
import { AppColors } from '@/components/shared/app-theme';
import {
  ADDRESS_AUTOCOMPLETE_MIN_CHARS,
  fetchAddressSuggestions,
  type AddressSuggestion,
} from '@/services/address-autocomplete';
import { reverseGeocodeForConfirmation } from '@/services/address-geocoding';
import {
  requestForegroundPermission,
  getOneTimeLocationFix,
} from '@/services/location';
import {
  getRecentAddStopPlaces,
  recordRecentAddressStop,
  recordRecentStoreStop,
  type RecentAddStopPlace,
} from '@/services/recent-add-stop-places';
import { routeLocationFromConfirmation } from '@/services/route-planning';
import { getStores } from '@/services/stores';
import type { RouteLocation } from '@/types/route-location';
import { createRouteLocationId } from '@/types/route-location';
import type { Store } from '@/types/store';
import { routeLocationFromStore } from '@/utils/route-location-from-store';
import {
  buildAddStopTopMatches,
  formatAddStopDistanceLabel,
  type AddStopTopMatch,
} from '@/utils/add-stop-top-matches';
import { resolveAddStopStoreIcon } from '@/utils/add-stop-store-icon';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { searchStores } from '@/utils/search-stores';

const ADDRESS_SEARCH_DEBOUNCE_MS = 350;

export type AddStopIntent = 'stop' | 'start' | 'finish';

type AddStopScreenProps = {
  currentRouteStoreIds?: string[];
  distanceAnchorLocation?: RouteLocation | null;
  intent?: AddStopIntent;
  onAddExistingStore?: (storeIds: string[]) => Promise<void>;
  onAddStop: (location: RouteLocation) => Promise<void>;
  onClose: () => void;
  onImportStores?: () => void;
  visible: boolean;
};

type Panel = 'main' | 'all-stores';

function cloneRouteLocationForStop(location: RouteLocation): RouteLocation {
  return {
    ...location,
    id: createRouteLocationId(),
  };
}

function StoreGlyph({
  name,
  size = AddStopLayout.rowIconSize,
}: {
  name: string;
  size?: number;
}) {
  const spec = resolveAddStopStoreIcon(name);

  return (
    <View
      style={[
        styles.rowIcon,
        { backgroundColor: spec.backgroundColor, height: size, width: size },
      ]}
    >
      {spec.label ? (
        <Text style={styles.rowIconLetter}>{spec.label}</Text>
      ) : (
        <Ionicons color={spec.glyphColor} name={spec.glyph} size={20} />
      )}
    </View>
  );
}

function AddStopPlusButton({
  accessibilityLabel,
  disabled,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.addCircle,
        disabled && styles.addCircleDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons color="#FFFFFF" name="add" size={22} />
    </Pressable>
  );
}

export function AddStopScreen({
  currentRouteStoreIds = [],
  distanceAnchorLocation = null,
  intent = 'stop',
  onAddExistingStore,
  onAddStop,
  onClose,
  onImportStores,
  visible,
}: AddStopScreenProps) {
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState<Panel>('main');
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<RecentAddStopPlace[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const addressSearchRequestRef = useRef(0);
  const inputRef = useRef<TextInput>(null);

  const routeStoreIdSet = useMemo(
    () => new Set(currentRouteStoreIds),
    [currentRouteStoreIds],
  );

  const trimmedQuery = query.trim();
  const isSearchActive = trimmedQuery.length >= ADDRESS_AUTOCOMPLETE_MIN_CHARS;

  const topMatches = useMemo(
    () =>
      buildAddStopTopMatches({
        excludeStoreIds: routeStoreIdSet,
        limit: panel === 'all-stores' ? 200 : 8,
        startLocation: distanceAnchorLocation,
        stores,
      }),
    [distanceAnchorLocation, panel, routeStoreIdSet, stores],
  );

  const filteredStores = useMemo(
    () =>
      searchStores(stores, trimmedQuery)
        .filter((store) => !routeStoreIdSet.has(store.id))
        .slice(0, 40),
    [routeStoreIdSet, stores, trimmedQuery],
  );

  const resetState = useCallback(() => {
    setPanel('main');
    setQuery('');
    setAddressSuggestions([]);
    setAddressSearchError(null);
    setIsSearchingAddresses(false);
    setError(null);
    setIsWorking(false);
    addressSearchRequestRef.current += 1;
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void getStores().then(setStores);
    void getRecentAddStopPlaces().then(setRecentPlaces);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
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

  useEffect(() => {
    if (!visible || !isSearchActive) {
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

      void fetchAddressSuggestions(trimmedQuery).then((result) => {
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
          return;
        }

        setAddressSuggestions(result.suggestions);
      });
    }, ADDRESS_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [isSearchActive, trimmedQuery, visible]);

  async function addStoreById(storeId: string) {
    if (isWorking || (intent === 'stop' && routeStoreIdSet.has(storeId))) {
      return;
    }

    const store = stores.find((entry) => entry.id === storeId);

    if (!store) {
      return;
    }

    if (!onAddExistingStore && intent === 'stop') {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      if (intent !== 'stop') {
        const location = routeLocationFromStore(store);
        await onAddStop(location);
        handleClose();
        return;
      }

      await onAddExistingStore!([storeId]);
      const display = formatPlanningStopDisplay(store);
      await recordRecentStoreStop({
        storeId,
        subtitle: display.subtitle,
        title: getStoreDisplayName(store),
      });
      handleClose();
    } catch (addError) {
      console.error('[AddStopScreen] add store failed:', addError);
      setError(
        intent === 'stop'
          ? 'Could not add this stop. Try again.'
          : 'Could not update this location. Try again.',
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function addRouteLocation(location: RouteLocation, recentTitle: string, recentSubtitle: string) {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      const payload = intent === 'stop' ? cloneRouteLocationForStop(location) : location;
      await onAddStop(payload);
      if (intent === 'stop') {
        await recordRecentAddressStop({
          location,
          subtitle: recentSubtitle,
          title: recentTitle,
        });
      }
      handleClose();
    } catch (addError) {
      console.error('[AddStopScreen] add location failed:', addError);
      setError(
        intent === 'stop'
          ? 'Could not add this stop. Try again.'
          : 'Could not update this location. Try again.',
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function addAddressSuggestion(suggestion: AddressSuggestion) {
    const location = routeLocationFromConfirmation({
      formattedAddress: suggestion.confirmation.formattedAddress,
      latitude: suggestion.confirmation.latitude,
      longitude: suggestion.confirmation.longitude,
      name: suggestion.primaryLine,
      source: 'manual',
    });

    await addRouteLocation(location, suggestion.primaryLine, suggestion.secondaryLine);
  }

  async function handleCurrentLocation() {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      const permission = await requestForegroundPermission();

      if (!permission.granted) {
        setError('Location access is required to use your current location.');
        return;
      }

      const fix = await getOneTimeLocationFix();

      if (!fix.ok) {
        setError("We couldn't read your location. Check your connection and try again.");
        return;
      }

      const confirmed = await reverseGeocodeForConfirmation({
        fallbackAddress: 'Current Location',
        latitude: fix.update.latitude,
        longitude: fix.update.longitude,
      });

      const location = routeLocationFromConfirmation({
        formattedAddress: confirmed.formattedAddress,
        latitude: confirmed.latitude,
        longitude: confirmed.longitude,
        name: confirmed.name ?? 'Current Location',
        source: 'current-location',
      });

      await addRouteLocation(
        location,
        location.name ?? 'Current Location',
        confirmed.formattedAddress,
      );
    } catch (locationError) {
      console.error('[AddStopScreen] current location failed:', locationError);
      setError('Could not add this stop. Try again.');
    } finally {
      setIsWorking(false);
    }
  }

  function renderQuickActions() {
    return (
      <ScrollView
        contentContainerStyle={styles.quickActionsContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setPanel('all-stores');
          }}
          style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
        >
          <View style={[styles.quickIconWrap, { backgroundColor: AppColors.orangeSoft }]}>
            <Ionicons color={AppColors.orange} name="star" size={22} />
          </View>
          <Text style={styles.quickTitle}>My Stores</Text>
          <Text style={styles.quickSubtitle}>Browse saved stores</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={isWorking}
          onPress={() => {
            void handleCurrentLocation();
          }}
          style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
        >
          <View style={[styles.quickIconWrap, { backgroundColor: AppColors.blueSoft }]}>
            <Ionicons color={AppColors.blue} name="navigate" size={22} />
          </View>
          <Text style={styles.quickTitle}>Current Location</Text>
          <Text style={styles.quickSubtitle}>Use where you are</Text>
        </Pressable>
      </ScrollView>
    );
  }

  function renderMatchRow(
    key: string,
    input: {
      accessibilityLabel: string;
      distanceMiles: number | null;
      icon: ReactNode;
      onAdd: () => void;
      subtitle: string;
      title: string;
    },
  ) {
    const distanceLabel = formatAddStopDistanceLabel(input.distanceMiles);

    return (
      <View key={key} style={styles.row}>
        {input.icon}
        <View style={styles.rowCopy}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {input.title}
          </Text>
          <Text numberOfLines={2} style={styles.rowSubtitle}>
            {input.subtitle}
          </Text>
        </View>
        {distanceLabel ? <Text style={styles.distancePill}>{distanceLabel}</Text> : null}
        <AddStopPlusButton
          accessibilityLabel={input.accessibilityLabel}
          disabled={isWorking}
          onPress={input.onAdd}
        />
      </View>
    );
  }

  function renderStoreMatch(match: AddStopTopMatch) {
    return renderMatchRow(match.store.id, {
      accessibilityLabel: `Add ${match.title} to route`,
      distanceMiles: match.distanceMiles,
      icon: <StoreGlyph name={match.title} />,
      onAdd: () => {
        void addStoreById(match.store.id);
      },
      subtitle: match.subtitle,
      title: match.title,
    });
  }

  function renderSearchResults() {
    return (
      <>
        {filteredStores.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stores</Text>
            {filteredStores.map((store) => {
              const display = formatPlanningStopDisplay(store);

              return renderMatchRow(`search-store-${store.id}`, {
                accessibilityLabel: `Add ${getStoreDisplayName(store)} to route`,
                distanceMiles: null,
                icon: <StoreGlyph name={getStoreDisplayName(store)} />,
                onAdd: () => {
                  void addStoreById(store.id);
                },
                subtitle: display.subtitle,
                title: getStoreDisplayName(store),
              });
            })}
          </View>
        ) : null}

        {isSearchingAddresses ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={AppColors.blue} size="small" />
            <Text style={styles.loadingText}>Searching addresses…</Text>
          </View>
        ) : null}

        {addressSearchError ? <Text style={styles.error}>{addressSearchError}</Text> : null}

        {addressSuggestions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Places</Text>
            {addressSuggestions.map((suggestion) =>
              renderMatchRow(`address-${suggestion.id}`, {
                accessibilityLabel: `Add ${suggestion.primaryLine} to route`,
                distanceMiles: null,
                icon: (
                  <View style={[styles.rowIcon, styles.addressIcon]}>
                    <Ionicons color={AppColors.blue} name="location-outline" size={20} />
                  </View>
                ),
                onAdd: () => {
                  void addAddressSuggestion(suggestion);
                },
                subtitle: suggestion.secondaryLine,
                title: suggestion.primaryLine,
              }),
            )}
          </View>
        ) : null}
      </>
    );
  }

  function renderRecentSection() {
    if (recentPlaces.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Places</Text>
        </View>
        {recentPlaces.slice(0, 5).map((place) =>
          renderMatchRow(place.id, {
            accessibilityLabel: `Add ${place.title} to route`,
            distanceMiles: null,
            icon: (
              <View style={[styles.rowIcon, styles.recentIcon]}>
                <Ionicons color={AppColors.textSecondary} name="time-outline" size={20} />
              </View>
            ),
            onAdd: () => {
              if (place.kind === 'store' && place.storeId) {
                void addStoreById(place.storeId);
                return;
              }

              if (place.kind === 'address' && place.location) {
                void addRouteLocation(place.location, place.title, place.subtitle);
              }
            },
            subtitle: place.subtitle,
            title: place.title,
          }),
        )}
      </View>
    );
  }

  const headerTitle = panel === 'all-stores' ? 'My Stores' : 'Add Stop';

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          {panel === 'all-stores' ? (
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setPanel('main');
              }}
              style={styles.headerSide}
            >
              <Ionicons color={AppColors.textPrimary} name="chevron-back" size={26} />
            </Pressable>
          ) : (
            <View style={styles.headerSide} />
          )}
          <Text accessibilityRole="header" style={styles.headerTitle}>
            {headerTitle}
          </Text>
          <Pressable
            accessibilityLabel="Close Add Stop"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons color={AppColors.textSecondary} name="close" size={26} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + keyboardHeight + 88 },
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchWrap}>
            <Ionicons color={AppColors.textSecondary} name="search" size={20} />
            <TextInput
              accessibilityLabel="Search for a store, address, or place"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isWorking}
              onChangeText={(value) => {
                setQuery(value);
                setError(null);
              }}
              placeholder="Search for a store, address, or place..."
              placeholderTextColor={AppColors.textMuted}
              ref={inputRef}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            <Pressable
              accessibilityLabel="Voice search not available"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                Alert.alert('Voice search', 'Voice search is not available yet.');
              }}
            >
              <Ionicons color={AppColors.textSecondary} name="mic-outline" size={22} />
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {panel === 'main' && !isSearchActive ? (
            <>
              {renderQuickActions()}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Top Matches</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setPanel('all-stores');
                    }}
                  >
                    <Text style={styles.sectionLink}>View all ›</Text>
                  </Pressable>
                </View>
                {topMatches.length > 0 ? (
                  topMatches.slice(0, 5).map(renderStoreMatch)
                ) : (
                  <Text style={styles.emptyHint}>Save stores to see matches here.</Text>
                )}
              </View>
              {renderRecentSection()}
            </>
          ) : null}

          {panel === 'all-stores' && !isSearchActive ? (
            <View style={styles.section}>{topMatches.map(renderStoreMatch)}</View>
          ) : null}

          {isSearchActive ? renderSearchResults() : null}
        </ScrollView>

        {panel === 'main' ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 12) + (keyboardHeight > 0 ? 0 : 0) },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Alert.alert('Search on Map', 'Map search is coming in a later update.');
              }}
              style={({ pressed }) => [styles.footerAction, pressed && styles.pressed]}
            >
              <Ionicons color={AppColors.blue} name="map-outline" size={20} />
              <Text style={styles.footerActionText}>Search on Map</Text>
            </Pressable>
            <View style={styles.footerDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                handleClose();
                onImportStores?.();
              }}
              style={({ pressed }) => [styles.footerAction, pressed && styles.pressed]}
            >
              <Ionicons color={AppColors.blue} name="cloud-upload-outline" size={20} />
              <Text style={styles.footerActionText}>Import from File</Text>
            </Pressable>
          </View>
        ) : null}

        {isWorking ? (
          <View pointerEvents="none" style={styles.workingOverlay}>
            <ActivityIndicator color={AppColors.blue} size="large" />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerSide: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: AddStopLayout.headerTitleSize,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: AppColors.backgroundElevated,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 16,
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.blue,
    borderRadius: AddStopLayout.searchRadius,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  quickActionsContent: {
    gap: 10,
    paddingRight: 4,
  },
  quickCard: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: AddStopLayout.quickActionCardHeight,
    padding: 12,
    width: AddStopLayout.quickActionCardWidth,
  },
  quickCardDisabled: {
    opacity: 0.55,
  },
  quickIconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
    width: 40,
  },
  quickTitle: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  quickSubtitle: {
    color: AppColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  section: {
    gap: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    color: AppColors.textPrimary,
    fontSize: AddStopLayout.sectionTitleSize,
    fontWeight: '700',
  },
  sectionLink: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: AppColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 20,
    justifyContent: 'center',
  },
  rowIconLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  addressIcon: {
    backgroundColor: AppColors.blueSoft,
  },
  recentIcon: {
    backgroundColor: AppColors.backgroundElevated,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },
  distancePill: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  addCircle: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: AddStopLayout.addButtonSize / 2,
    height: AddStopLayout.addButtonSize,
    justifyContent: 'center',
    width: AddStopLayout.addButtonSize,
  },
  addCircleDisabled: {
    opacity: 0.5,
  },
  footer: {
    backgroundColor: AppColors.background,
    borderTopColor: AppColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerAction: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  footerActionText: {
    color: AppColors.blue,
    fontSize: AddStopLayout.footerActionSize,
    fontWeight: '700',
  },
  footerDivider: {
    backgroundColor: AppColors.border,
    width: StyleSheet.hairlineWidth,
  },
  error: {
    color: AppColors.red,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyHint: {
    color: AppColors.textSecondary,
    fontSize: 14,
    paddingVertical: 8,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  workingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(8, 10, 14, 0.35)',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
