import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { MyLocationsSettings } from '@/components/settings/my-locations-settings';
import { ScreenScaffold } from '@/components/redesign/layout/screen-scaffold';
import { InformationRow } from '@/components/redesign/primitives/information-row';
import { LoadingState } from '@/components/redesign/primitives/loading-state';
import { ScreenHeader } from '@/components/redesign/primitives/screen-header';
import { SectionCard } from '@/components/redesign/primitives/section-card';
import {
  AppColors,
  AppSpacing,
} from '@/components/shared/app-theme';
import { useMyLocations } from '@/hooks/use-my-locations';
import { useRoutePlanning } from '@/hooks/use-route-planning';
import { getEffectiveEndLocation } from '@/services/route-planning';
import { getStores } from '@/services/stores';
import {
  getAfterCompletionDefault,
  getAutoCheckInMode,
  setAfterCompletionDefault,
  setAutoCheckInMode,
} from '@/services/workflow-preferences';
import {
  AfterCompletionLabels,
  cycleAfterCompletionMode,
  type AfterCompletionMode,
} from '@/types/after-completion';
import {
  AUTO_CHECK_IN_MODE_LABELS,
  cycleAutoCheckInMode,
  type AutoCheckInMode,
} from '@/types/auto-check-in';

function defaultMapsAppLabel(): string {
  return Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps';
}

function locationSummary(name: string | undefined, address: string): string {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  return address.split('\n')[0] ?? address;
}

export function ProfileScreen() {
  const router = useRouter();
  const [storeCount, setStoreCount] = useState<number | null>(null);
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
  const { draft: planningDraft, isLoading: isPlanningLoading } = useRoutePlanning();

  useFocusEffect(
    useCallback(() => {
      void getAfterCompletionDefault().then(setAfterCompletionDefaultState);
      void getAutoCheckInMode().then(setAutoCheckInModeState);
      void getStores().then((stores) => {
        setStoreCount(stores.length);
      });
    }, []),
  );

  const endLocation = getEffectiveEndLocation(planningDraft);
  const startSummary = planningDraft.startLocation
    ? locationSummary(
        planningDraft.startLocation.name,
        planningDraft.startLocation.formattedAddress,
      )
    : locations[0]?.label ?? 'Not set';
  const finishSummary = planningDraft.returnToStart
    ? 'Same as start location'
    : endLocation
      ? locationSummary(endLocation.name, endLocation.formattedAddress)
      : 'Not set';

  async function handleCycleAutoCheckInMode() {
    const nextMode = cycleAutoCheckInMode(autoCheckInMode);

    await setAutoCheckInMode(nextMode);
    setAutoCheckInModeState(nextMode);
  }

  async function handleCycleAfterCompletionDefault() {
    const nextMode = cycleAfterCompletionMode(afterCompletionDefault);

    await setAfterCompletionDefault(nextMode);
    setAfterCompletionDefaultState(nextMode);
  }

  const storesLabel =
    storeCount === null ? '…' : `${storeCount} ${storeCount === 1 ? 'Store' : 'Stores'}`;

  return (
    <ScreenScaffold scroll={false}>
      <ScreenHeader
        onBack={() => {
          router.back();
        }}
        title="Profile"
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isPlanningLoading && !planningDraft.updatedAt ? (
          <LoadingState message="Loading profile…" />
        ) : null}

        <SectionCard
          accentColor={AppColors.green}
          icon="navigate-outline"
          subtitle="Set up how your workday runs"
          title="Workday"
        >
          <InformationRow
            icon="location-outline"
            iconColor={AppColors.green}
            label="Default Start Location"
            value={startSummary}
          />
          <InformationRow
            icon="flag-outline"
            iconColor={AppColors.green}
            label="Default Finish Location"
            value={finishSummary}
          />
          <InformationRow
            icon="compass-outline"
            iconColor={AppColors.green}
            label="Navigation App"
            value={defaultMapsAppLabel()}
          />
          <InformationRow
            icon="git-compare-outline"
            iconColor={AppColors.green}
            label="Auto Navigation"
            onPress={() => {
              void handleCycleAfterCompletionDefault();
            }}
            value={AfterCompletionLabels[afterCompletionDefault]}
            valueColor={AppColors.green}
          />
          <InformationRow
            icon="person-circle-outline"
            iconColor={AppColors.green}
            label="Auto Check-In"
            onPress={() => {
              void handleCycleAutoCheckInMode();
            }}
            value={AUTO_CHECK_IN_MODE_LABELS[autoCheckInMode]}
            valueColor={AppColors.green}
          />
        </SectionCard>

        <Text style={styles.sectionHint}>Saved places for route setup</Text>
        <MyLocationsSettings
          isLoading={isMyLocationsLoading}
          locations={locations}
          onAddLocation={createLocation}
          onDeleteLocation={removeLocation}
          onEditLocation={updateLocation}
        />

        <SectionCard accentColor={AppColors.orange} icon="storefront-outline" title="Stores">
          <InformationRow
            icon="storefront-outline"
            iconColor={AppColors.orange}
            label="My Stores"
            onPress={() => {
              router.push('/(tabs)/stores' as const);
            }}
            value={storesLabel}
            valueColor={AppColors.orange}
          />
          <InformationRow
            icon="cloud-download-outline"
            iconColor={AppColors.orange}
            label="Import Stores"
            onPress={() => {
              router.push('/store-import' as const);
            }}
          />
        </SectionCard>

        <SectionCard accentColor={AppColors.textSecondary} icon="settings-outline" title="App">
          <InformationRow
            icon="pulse-outline"
            label="Diagnostics"
            onPress={() => {
              router.push('/diagnostics' as const);
            }}
          />
          {__DEV__ ? (
            <InformationRow
              icon="bug-outline"
              label="Developer Tools"
              onPress={() => {
                router.push('/(tabs)/settings' as const);
              }}
              value="Settings"
            />
          ) : null}
        </SectionCard>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: AppSpacing.sectionGap,
    paddingBottom: AppSpacing.shellBottomPadding,
  },
  sectionHint: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
  },
});
