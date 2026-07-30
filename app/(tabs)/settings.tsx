import { useCallback, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { MyLocationsSettings } from '@/components/settings/my-locations-settings';
import { AppColors } from '@/components/shared/app-theme';
import { useMyLocations } from '@/hooks/use-my-locations';
import {
  getDevSimulateArrival,
  setDevSimulateArrival,
} from '@/services/dev-arrival-override';
import { loadIncompleteTestRoute, loadLargeIncompleteTestRoute } from '@/services/seed-stores';
import {
  getAfterCompletionDefault,
  getAutoCheckInMode,
  setAfterCompletionDefault,
  setAutoCheckInMode,
} from '@/services/workflow-preferences';
import {
  AfterCompletionIcons,
  AfterCompletionLabels,
  cycleAfterCompletionMode,
  type AfterCompletionMode,
} from '@/types/after-completion';
import {
  AUTO_CHECK_IN_MODE_LABELS,
  cycleAutoCheckInMode,
  type AutoCheckInMode,
} from '@/types/auto-check-in';
import { resetAutomaticCheckInSessionState } from '@/services/arrival-check-in';

export default function SettingsScreen() {
  const router = useRouter();
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [simulateArrival, setSimulateArrival] = useState(false);
  const [afterCompletionDefault, setAfterCompletionDefaultState] =
    useState<AfterCompletionMode>('open_directions');
  const [autoCheckInMode, setAutoCheckInModeState] =
    useState<AutoCheckInMode>('ask');
  const {
    createLocation,
    isLoading: isMyLocationsLoading,
    locations,
    removeLocation,
    updateLocation,
  } = useMyLocations();

  useFocusEffect(
    useCallback(() => {
      void getDevSimulateArrival().then(setSimulateArrival);
      void getAfterCompletionDefault().then(setAfterCompletionDefaultState);
      void getAutoCheckInMode().then(setAutoCheckInModeState);
    }, []),
  );

  async function handleToggleSimulateArrival() {
    const nextValue = !simulateArrival;

    await setDevSimulateArrival(nextValue);
    setSimulateArrival(nextValue);
  }

  async function handleCycleAutoCheckInMode() {
    const nextMode = cycleAutoCheckInMode(autoCheckInMode);

    await setAutoCheckInMode(nextMode);
    setAutoCheckInModeState(nextMode);
  }

  async function handleResetDevArrivalHandling() {
    resetAutomaticCheckInSessionState();
    Alert.alert(
      'Arrival handling reset',
      'Automatic check-in locks cleared for this session. Toggle Simulate arrival to re-test.',
    );
  }

  async function handleCycleAfterCompletionDefault() {
    const nextMode = cycleAfterCompletionMode(afterCompletionDefault);

    await setAfterCompletionDefault(nextMode);
    setAfterCompletionDefaultState(nextMode);
  }

  async function handleLoadLargeIncompleteRoute() {
    setIsLoadingRoute(true);

    try {
      await loadLargeIncompleteTestRoute();
      Alert.alert(
        'Large test route loaded',
        'Demo Stop 11 is current with 11 stops remaining. Open Today to continue.',
      );
    } catch (error) {
      console.error('[Settings] loadLargeIncompleteTestRoute failed:', error);
      Alert.alert('Could not load route', 'Please try again.');
    } finally {
      setIsLoadingRoute(false);
    }
  }

  async function handleLoadIncompleteRoute() {
    setIsLoadingRoute(true);

    try {
      await loadIncompleteTestRoute();
      Alert.alert(
        'Test route loaded',
        'Harbor Market is current with 3 stops remaining. Open Today to continue.',
      );
    } catch (error) {
      console.error('[Settings] loadIncompleteTestRoute failed:', error);
      Alert.alert('Could not load route', 'Please try again.');
    } finally {
      setIsLoadingRoute(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.card}>
          <Text style={styles.label}>MileMate</Text>
          <Text style={styles.value}>Field workday organization</Text>
        </View>

        <Text style={styles.sectionTitle}>My Locations</Text>
        <MyLocationsSettings
          isLoading={isMyLocationsLoading}
          locations={locations}
          onAddLocation={createLocation}
          onDeleteLocation={removeLocation}
          onEditLocation={updateLocation}
        />

        <Text style={styles.sectionTitle}>Store Management</Text>
        <Pressable
          onPress={() => {
            router.push('/store-import' as const);
          }}
          style={styles.settingRow}
        >
          <Text style={styles.settingLabel}>Import Stores</Text>
          <Text style={styles.settingValue}>CSV</Text>
        </Pressable>
        <Text style={styles.helperText}>
          Import stores from a CSV file with flexible column names. Store number and store name are
          optional.
        </Text>

        <Text style={styles.sectionTitle}>Visit Check-In</Text>
        <Pressable
          onPress={() => {
            void handleCycleAutoCheckInMode();
          }}
          style={styles.settingRow}
        >
          <Text style={styles.settingLabel}>Automatic Check-In</Text>
          <Text style={styles.settingValue}>
            {AUTO_CHECK_IN_MODE_LABELS[autoCheckInMode]}
          </Text>
        </Pressable>
        <Text style={styles.helperText}>
          Choose what MileMate should do after it confirms you&apos;ve arrived at
          the current stop.
        </Text>
        {autoCheckInMode === 'automatic' ? (
          <Text style={styles.helperText}>
            MileMate will check you in after your location remains inside the
            store area long enough to confirm arrival.
          </Text>
        ) : null}
        <Text style={styles.helperTextMuted}>
          Arrival detection currently works while MileMate is active during your
          workday.
        </Text>

        <Text style={styles.sectionTitle}>Navigation</Text>
        <Pressable
          onPress={() => {
            void handleCycleAfterCompletionDefault();
          }}
          style={styles.settingRow}
        >
          <Text style={styles.settingLabel}>After Completion</Text>
          <Text style={styles.settingValue}>
            {AfterCompletionIcons[afterCompletionDefault]}{' '}
            {AfterCompletionLabels[afterCompletionDefault]}
          </Text>
        </Pressable>
        <Text
          onPress={() => {
            router.push('/diagnostics' as const);
          }}
          style={styles.link}
        >
          Open GPS Diagnostics
        </Text>
        {__DEV__ ? (
          <>
            <Pressable
              onPress={() => {
                router.push('/order-storage-diagnostic' as const);
              }}
              style={({ pressed }) => [styles.devButton, pressed && styles.devButtonPressed]}
            >
              <Text style={styles.devButtonLabel}>Order storage diagnostic</Text>
              <Text style={styles.devButtonHint}>
                Inspect AsyncStorage order keys and export a read-only JSON backup.
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void handleLoadIncompleteRoute();
              }}
              style={({ pressed }) => [
                styles.devButton,
                pressed && styles.devButtonPressed,
                isLoadingRoute && styles.devButtonDisabled,
              ]}
            >
              <Text style={styles.devButtonLabel}>
                {isLoadingRoute ? 'Loading route…' : 'Load incomplete test route'}
              </Text>
              <Text style={styles.devButtonHint}>
                2 completed · Harbor Market current · 3 pending
              </Text>
            </Pressable>
            <Pressable
              disabled={isLoadingRoute}
              onPress={() => {
                void handleLoadLargeIncompleteRoute();
              }}
              style={({ pressed }) => [
                styles.devButton,
                pressed && styles.devButtonPressed,
                isLoadingRoute && styles.devButtonDisabled,
              ]}
            >
              <Text style={styles.devButtonLabel}>
                {isLoadingRoute ? 'Loading route…' : 'Load 22-stop demo route'}
              </Text>
              <Text style={styles.devButtonHint}>
                10 completed · Demo Stop 11 current · 11 pending
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void handleResetDevArrivalHandling();
              }}
              style={({ pressed }) => [
                styles.devButton,
                pressed && styles.devButtonPressed,
              ]}
            >
              <Text style={styles.devButtonLabel}>Reset arrival handling</Text>
              <Text style={styles.devButtonHint}>
                Clears automatic check-in locks so the same visit can be tested again.
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void handleToggleSimulateArrival();
              }}
              style={({ pressed }) => [
                styles.devButton,
                pressed && styles.devButtonPressed,
              ]}
            >
              <Text style={styles.devButtonLabel}>
                {simulateArrival ? 'Simulate arrival: On' : 'Simulate arrival: Off'}
              </Text>
              <Text style={styles.devButtonHint}>
                Forces the Current Stop into the arrived state for testing.
              </Text>
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
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginBottom: 16,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  value: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  sectionTitle: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  settingRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingValue: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    marginTop: -8,
  },
  helperTextMuted: {
    color: AppColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  link: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '600',
  },
  devButton: {
    backgroundColor: '#FFFFFF',
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginTop: 20,
    padding: 16,
  },
  devButtonPressed: {
    opacity: 0.85,
  },
  devButtonDisabled: {
    opacity: 0.6,
  },
  devButtonHint: {
    color: AppColors.textSecondary,
    fontSize: 13,
  },
  devButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
