import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AddStopScreen, type AddStopIntent } from '@/components/add-stop/add-stop-screen';
import { BuildRoutePlanningScreen } from '@/components/coordinator/build-route-planning-screen';
import { PlanningDayHeader } from '@/components/coordinator/planning-day-header';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { PlanningStopEditorSheet } from '@/components/coordinator/planning-stop-editor-sheet';
import { PlanningStopList } from '@/components/coordinator/planning-stop-list';
import { RouteEndpointCard } from '@/components/coordinator/route-endpoint-card';
import { RoutePlanningBlankActions } from '@/components/coordinator/route-planning-blank-actions';
import { RoutePlanningSetRouteButton } from '@/components/coordinator/route-planning-set-route-button';
import { SaveWorkdaySheet } from '@/components/coordinator/save-workday-sheet';
import { WorkdayTemplateStopsSheet } from '@/components/coordinator/workday-template-stops-sheet';
import { SavedWorkdaysSheet } from '@/components/coordinator/saved-workdays-sheet';
import { AppColors } from '@/components/shared/app-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePlanningRouteSummary } from '@/hooks/use-planning-route-summary';
import {
  addExistingStoresToTodayRoute,
  addManualStopToTodayRoute,
  removeStopFromTodayRoute,
  reorderTodayRouteVisits,
} from '@/services/route-calculation';
import { geocodeStoreIfNeeded } from '@/services/store-geocoding';
import { getStoreById } from '@/services/stores';
import {
  applyWorkdayTemplateAddMissing,
  applyWorkdayTemplateReplace,
  deleteWorkdayTemplate,
  findWorkdayTemplateByName,
  getWorkdayTemplates,
  replaceExistingWorkdayTemplateByName,
  saveCurrentStopsAsWorkdayTemplate,
  updateWorkdayTemplate,
} from '@/services/workday-templates';
import type { RouteLocation } from '@/types/route-location';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { SavedLocation } from '@/types/saved-location';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { WorkdayTemplate } from '@/types/workday-template';
import { logSaveWorkdayDev } from '@/utils/save-workday-dev-log';
import { routeLocationFromStore } from '@/utils/route-location-from-store';
import { getFinishLocation, hasVisitStops, isBlankRoute } from '@/utils/route-state';

const SAVE_WORKDAY_SHEET_OPEN_DELAY_MS = Platform.OS === 'ios' ? 400 : 350;

type CoordinatorPlanningScreenProps = {
  draft: RoutePlanningDraft;
  duringActiveWorkday?: boolean;
  myLocations: SavedLocation[];
  onAddressEntryActiveChange?: (active: boolean) => void;
  onExitActiveRouteEdit?: () => void;
  onImportStores?: () => void;
  onLoadSavedRoute?: () => void;
  onRefresh: () => Promise<void>;
  onReturnToLauncher?: () => void;
  onSetRoute?: () => void;
  addStopAnchorRef?: RefObject<View | null>;
  routeSetDisabled?: boolean;
  routeSetBlockerMessage?: string | null;
  isCalculatingRoute?: boolean;
  onUpdateLocations: (input: {
    startLocation?: RouteLocation | null;
    endLocation?: RouteLocation | null;
    returnToStart?: boolean;
  }) => Promise<RoutePlanningDraft>;
  storesById: Record<string, Store>;
  visits: StoreVisit[];
};

type SaveWorkdayMode =
  | { kind: 'create' }
  | { kind: 'rename'; template: WorkdayTemplate };

export function CoordinatorPlanningScreen({
  draft,
  duringActiveWorkday = false,
  myLocations,
  onAddressEntryActiveChange,
  onExitActiveRouteEdit,
  onImportStores,
  onLoadSavedRoute,
  onRefresh,
  onReturnToLauncher,
  onSetRoute,
  addStopAnchorRef,
  routeSetDisabled = true,
  routeSetBlockerMessage = null,
  isCalculatingRoute = false,
  onUpdateLocations,
  storesById,
  visits,
}: CoordinatorPlanningScreenProps) {
  const [showAddStop, setShowAddStop] = useState(false);
  const [showSavedWorkdays, setShowSavedWorkdays] = useState(false);
  const [showSaveWorkday, setShowSaveWorkday] = useState(false);
  const [saveWorkdayMode, setSaveWorkdayMode] = useState<SaveWorkdayMode>({ kind: 'create' });
  const [workdayTemplates, setWorkdayTemplates] = useState<WorkdayTemplate[]>([]);
  const [addStopIntent, setAddStopIntent] = useState<AddStopIntent>('stop');
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [managingTemplate, setManagingTemplate] = useState<WorkdayTemplate | null>(null);
  const openSaveWorkdayAfterDismissRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const hasStops = hasVisitStops(visits);
  const blankRoute = isBlankRoute(visits);
  const showBuildRouteShell = !duringActiveWorkday && draft.phase === 'planning';
  const finishLocation = getFinishLocation(draft);
  const planningSummary = usePlanningRouteSummary({
    draft,
    isCalculating: isCalculatingRoute,
    storesById,
    visits,
  });
  const endpointsLocked = duringActiveWorkday;
  const isAddressEntryActive = showAddStop || editingStoreId !== null;

  const refreshWorkdayTemplates = useCallback(async () => {
    setWorkdayTemplates(await getWorkdayTemplates());
  }, []);

  useEffect(() => {
    return () => {
      if (openSaveWorkdayAfterDismissRef.current) {
        clearTimeout(openSaveWorkdayAfterDismissRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onAddressEntryActiveChange?.(isAddressEntryActive);
  }, [isAddressEntryActive, onAddressEntryActiveChange]);

  useEffect(() => {
    return () => {
      onAddressEntryActiveChange?.(false);
    };
  }, [onAddressEntryActiveChange]);

  useEffect(() => {
    void refreshWorkdayTemplates();
  }, [refreshWorkdayTemplates]);

  useEffect(() => {
    if (visits.length === 0) {
      setEditingStoreId(null);
    }
  }, [visits.length]);

  function handleReturnToActiveRoute() {
    setEditingStoreId(null);

    if (duringActiveWorkday) {
      onExitActiveRouteEdit?.();
    }
  }

  function handleRequestRemoveStop(visitId: string, stopName: string) {
    Alert.alert(
      'Remove stop?',
      `Remove ${stopName} from today's route? The store stays in your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeStopFromTodayRoute(visitId).then(onRefresh);
          },
        },
      ],
    );
  }

  const editingStore =
    editingStoreId !== null ? storesById[editingStoreId] ?? null : null;

  function openAddStopPicker(intent: AddStopIntent) {
    setAddStopIntent(intent);
    setShowAddStop(true);
  }

  function closeAddStopPicker() {
    setShowAddStop(false);
    setAddStopIntent('stop');
  }

  async function applyLocationFromAddScreen(location: RouteLocation) {
    if (addStopIntent === 'start') {
      await onUpdateLocations({ startLocation: location });
      await onRefresh();
      return;
    }

    if (addStopIntent === 'finish') {
      await onUpdateLocations({ endLocation: location, returnToStart: false });
      await onRefresh();
      return;
    }

    await handleAddStop(location);
  }

  async function applyStoresFromAddScreen(storeIds: string[]) {
    if (addStopIntent === 'stop') {
      await handleAddExistingStore(storeIds);
      return;
    }

    const storeId = storeIds[0];

    if (!storeId) {
      return;
    }

    let store = storesById[storeId] ?? (await getStoreById(storeId));

    if (!store) {
      return;
    }

    store = await geocodeStoreIfNeeded(store);
    await applyLocationFromAddScreen(routeLocationFromStore(store));
  }

  async function handleAddExistingStore(storeIds: string[]) {
    if (isAddingStop) {
      return;
    }

    setIsAddingStop(true);

    try {
      await addExistingStoresToTodayRoute(storeIds);
      await onRefresh();
    } finally {
      setIsAddingStop(false);
    }
  }

  async function handleAddStop(location: RouteLocation) {
    if (isAddingStop) {
      return;
    }

    setIsAddingStop(true);

    try {
      await addManualStopToTodayRoute(location);
      await onRefresh();
    } finally {
      setIsAddingStop(false);
    }
  }

  async function handleLoadWorkdayTemplate(template: WorkdayTemplate) {
    setShowSavedWorkdays(false);

    if (visits.length === 0) {
      await applyWorkdayTemplateReplace(template);
      await onRefresh();
      return;
    }

    Alert.alert(
      `Load ${template.name}`,
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace Current Stops',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await applyWorkdayTemplateReplace(template);
              await onRefresh();
            })();
          },
        },
        {
          text: 'Add Missing Stops',
          onPress: () => {
            void (async () => {
              const result = await applyWorkdayTemplateAddMissing(template);
              await onRefresh();

              if (result.addedCount > 0 || result.skippedCount > 0) {
                Alert.alert(
                  `${template.name} loaded`,
                  `${result.addedCount} stop${result.addedCount === 1 ? '' : 's'} added · ${result.skippedCount} already included`,
                );
              }
            })();
          },
        },
      ],
    );
  }

  function openSaveWorkdaySheet(mode: SaveWorkdayMode = { kind: 'create' }) {
    setSaveWorkdayMode(mode);
    setShowSaveWorkday(true);
    logSaveWorkdayDev('Save Workday sheet opened', {
      mode: mode.kind === 'rename' ? 'rename' : 'create',
    });
  }

  function scheduleOpenSaveWorkdaySheet(mode: SaveWorkdayMode = { kind: 'create' }) {
    if (openSaveWorkdayAfterDismissRef.current) {
      clearTimeout(openSaveWorkdayAfterDismissRef.current);
    }

    openSaveWorkdayAfterDismissRef.current = setTimeout(() => {
      openSaveWorkdayAfterDismissRef.current = null;
      logSaveWorkdayDev('Saved Workdays sheet dismissed');
      openSaveWorkdaySheet(mode);
    }, SAVE_WORKDAY_SHEET_OPEN_DELAY_MS);
  }

  function beginSaveCurrentAsWorkday() {
    logSaveWorkdayDev('Save Current button pressed');
    setShowSavedWorkdays(false);
    scheduleOpenSaveWorkdaySheet({ kind: 'create' });
  }

  async function showSaveWorkdaySuccess(workdayName: string) {
    await refreshWorkdayTemplates();
    logSaveWorkdayDev('template refresh completed');
    Alert.alert('Saved', `Saved as "${workdayName}"`);
    logSaveWorkdayDev('success feedback shown', { workdayName });
  }

  function handleSaveWorkdayFailure(
    error: unknown,
    options: { reopenSheet?: boolean } = {},
  ) {
    console.error('[CoordinatorPlanning] save workday failed:', error);
    logSaveWorkdayDev('save failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });

    if (options.reopenSheet) {
      openSaveWorkdaySheet({ kind: 'create' });
    }

    Alert.alert('Could not save workday', 'Please try again.');
  }

  async function handleSaveWorkday(name: string) {
    const trimmedName = name.trim();

    logSaveWorkdayDev('handleSaveWorkday entered', {
      mode: saveWorkdayMode.kind === 'rename' ? 'rename' : 'create',
      visitCount: visits.length,
      workdayName: trimmedName,
    });

    if (!trimmedName) {
      return;
    }

    if (saveWorkdayMode.kind !== 'rename' && visits.length === 0) {
      Alert.alert(
        'No stops to save',
        'Add at least one stop before saving a workday.',
      );
      return;
    }

    try {
      if (saveWorkdayMode.kind === 'rename') {
        const conflicting = await findWorkdayTemplateByName(trimmedName);

        if (conflicting && conflicting.id !== saveWorkdayMode.template.id) {
          Alert.alert('Name already in use', 'A saved workday with that name already exists.');
          return;
        }

        await updateWorkdayTemplate(saveWorkdayMode.template.id, { name: trimmedName });
        setShowSaveWorkday(false);
        await refreshWorkdayTemplates();
        logSaveWorkdayDev('template refresh completed');
        return;
      }

      const existing = await findWorkdayTemplateByName(trimmedName);

      if (existing) {
        setShowSaveWorkday(false);
        Alert.alert(
          `A saved workday named ${trimmedName} already exists.`,
          undefined,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Choose Another Name',
              onPress: () => {
                openSaveWorkdaySheet({ kind: 'create' });
              },
            },
            {
              text: 'Replace Existing',
              style: 'destructive',
              onPress: () => {
                void (async () => {
                  logSaveWorkdayDev('handleSaveWorkday entered', {
                    mode: 'replace',
                    visitCount: visits.length,
                    workdayName: trimmedName,
                  });

                  try {
                    await replaceExistingWorkdayTemplateByName({
                      name: trimmedName,
                      visits,
                      storesById,
                    });
                    await showSaveWorkdaySuccess(trimmedName);
                  } catch (error) {
                    handleSaveWorkdayFailure(error, { reopenSheet: true });
                  }
                })();
              },
            },
          ],
        );
        return;
      }

      logSaveWorkdayDev('persistence write started', { mode: 'create' });
      await saveCurrentStopsAsWorkdayTemplate({
        name: trimmedName,
        visits,
        storesById,
      });
      setShowSaveWorkday(false);
      await showSaveWorkdaySuccess(trimmedName);
    } catch (error) {
      handleSaveWorkdayFailure(error, { reopenSheet: true });
    }
  }

  function handleManageTemplate(template: WorkdayTemplate) {
    setShowSavedWorkdays(false);
    setManagingTemplate(template);
  }

  const planningSheets = (
    <>
      <AddStopScreen
        currentRouteStoreIds={visits.map((visit) => visit.storeId)}
        distanceAnchorLocation={draft.startLocation}
        intent={addStopIntent}
        onAddExistingStore={applyStoresFromAddScreen}
        onAddStop={applyLocationFromAddScreen}
        onClose={closeAddStopPicker}
        onImportStores={onImportStores}
        visible={showAddStop}
      />

      <SavedWorkdaysSheet
        canSaveCurrent={hasStops}
        onClose={() => {
          setShowSavedWorkdays(false);
        }}
        onManageTemplate={handleManageTemplate}
        onSaveCurrent={beginSaveCurrentAsWorkday}
        onSelectTemplate={(template) => {
          void handleLoadWorkdayTemplate(template);
        }}
        templates={workdayTemplates}
        visible={showSavedWorkdays}
      />

      <SaveWorkdaySheet
        initialName={
          saveWorkdayMode.kind === 'rename' ? saveWorkdayMode.template.name : ''
        }
        onClose={() => {
          setShowSaveWorkday(false);
        }}
        onSave={(name) => {
          void handleSaveWorkday(name);
        }}
        primaryLabel={saveWorkdayMode.kind === 'rename' ? 'Save Name' : 'Save Workday'}
        title={saveWorkdayMode.kind === 'rename' ? 'Rename Workday' : 'Save Workday'}
        visible={showSaveWorkday && !showSavedWorkdays}
      />

      <PlanningStopEditorSheet
        onClose={() => {
          setEditingStoreId(null);
        }}
        onSaved={() => {
          void onRefresh();
        }}
        store={editingStore}
        visible={editingStoreId !== null}
      />

      <WorkdayTemplateStopsSheet
        onClose={() => {
          setManagingTemplate(null);
        }}
        onDeleted={() => {
          void refreshWorkdayTemplates();
        }}
        onRequestRename={(templateToRename) => {
          setManagingTemplate(null);
          openSaveWorkdaySheet({ kind: 'rename', template: templateToRename });
        }}
        onUpdated={() => {
          void refreshWorkdayTemplates();
        }}
        template={managingTemplate}
        visible={managingTemplate !== null}
      />
    </>
  );

  if (showBuildRouteShell) {
    return (
      <>
        <BuildRoutePlanningScreen
          blockerMessage={routeSetBlockerMessage ?? 'Add at least one stop to continue.'}
          distanceLabel={planningSummary.distanceLabel}
          draft={draft}
          finishLocation={finishLocation}
          hasStops={hasStops}
          isCalculatingRoute={isCalculatingRoute}
          onAddStop={() => {
            openAddStopPicker('stop');
          }}
          onBack={() => {
            onReturnToLauncher?.();
          }}
          onOpenMenu={() => {
            setShowSavedWorkdays(true);
          }}
          onPressFinish={() => {
            openAddStopPicker('finish');
          }}
          onPressStart={() => {
            openAddStopPicker('start');
          }}
          onPressStop={(storeId) => {
            setEditingStoreId(storeId);
          }}
          onRemoveStop={handleRequestRemoveStop}
          onReorderStops={(orderedVisitIds) => {
            void reorderTodayRouteVisits(orderedVisitIds, {
              duringActiveWorkday,
            }).then(onRefresh);
          }}
          addStopAnchorRef={addStopAnchorRef}
          onSetRoute={onSetRoute}
          routeSetDisabled={routeSetDisabled || !planningSummary.hasStops}
          stopsLabel={planningSummary.stopsLabel}
          storesById={storesById}
          timeLabel={planningSummary.timeLabel}
          visits={visits}
        />
        {planningSheets}
      </>
    );
  }

  return (
    <View style={styles.container}>
      {onReturnToLauncher && !duringActiveWorkday ? (
        <Pressable
          accessibilityLabel="Back to route launcher"
          accessibilityRole="button"
          onPress={onReturnToLauncher}
          style={({ pressed }) => [styles.launcherBackRow, pressed && styles.pressed]}
        >
          <Ionicons color={AppColors.blue} name="chevron-back" size={22} />
          <Text style={styles.launcherBackText}>Back to launcher</Text>
        </Pressable>
      ) : null}

      <PlanningDayHeader />

      <RouteEndpointCard
        kind="start"
        location={draft.startLocation}
        locked={endpointsLocked}
        onPress={
          endpointsLocked
            ? undefined
            : () => {
                openAddStopPicker('start');
              }
        }
      />

      <View style={styles.section}>
        <View style={styles.headerRow}>
          {duringActiveWorkday ? (
            <Pressable
              accessibilityLabel="Back to active route"
              accessibilityRole="button"
              onPress={handleReturnToActiveRoute}
              style={({ pressed }) => [styles.headerSideButton, pressed && styles.pressed]}
            >
              <Text style={styles.doneHeaderText}>Done</Text>
            </Pressable>
          ) : null}
          <Text
            style={
              duringActiveWorkday ? styles.sectionHeadingCenter : styles.sectionHeading
            }
          >
            Stops
          </Text>
          {hasStops && !duringActiveWorkday ? (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Add stop"
                accessibilityRole="button"
                disabled={isAddingStop}
                onPress={() => {
                  openAddStopPicker('stop');
                }}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <Ionicons color={AppColors.blue} name="add" size={24} />
              </Pressable>
              <Pressable
                accessibilityLabel="Open saved workdays"
                accessibilityRole="button"
                onPress={() => {
                  setShowSavedWorkdays(true);
                }}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <IconSymbol color={AppColors.blue} name="folder.fill" size={22} />
              </Pressable>
            </View>
          ) : hasStops ? (
            <Pressable
              accessibilityLabel="Add stop"
              accessibilityRole="button"
              disabled={isAddingStop}
              onPress={() => {
                openAddStopPicker('stop');
              }}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons color={AppColors.blue} name="add" size={24} />
            </Pressable>
          ) : (
            <View style={styles.headerSideButton} />
          )}
        </View>

        {blankRoute ? (
          <RoutePlanningBlankActions
            onAddStores={() => {
              openAddStopPicker('stop');
            }}
            onImportStores={() => {
              onImportStores?.();
            }}
            onLoadRoute={() => {
              onLoadSavedRoute?.();
            }}
          />
        ) : (
          <PlanningStopList
            duringActiveWorkday={duringActiveWorkday}
            onPressStop={(storeId) => {
              setEditingStoreId(storeId);
            }}
            onRemove={handleRequestRemoveStop}
            onReorder={(orderedVisitIds) => {
              void reorderTodayRouteVisits(orderedVisitIds, {
                duringActiveWorkday,
              }).then(onRefresh);
            }}
            storesById={storesById}
            visits={visits}
          />
        )}

        {hasStops ? (
          <Pressable
            accessibilityRole="button"
            disabled={isAddingStop}
            onPress={() => {
              openAddStopPicker('stop');
            }}
            style={({ pressed }) => [styles.addStopButton, pressed && styles.pressed]}
          >
            <Ionicons color={AppColors.blue} name="add" size={18} style={styles.addStopIcon} />
            <Text style={styles.addStopText}>Add Stop</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.finishBlock}>
        <RouteEndpointCard
          kind="finish"
          location={finishLocation}
          locked={endpointsLocked}
          onPress={
            endpointsLocked
              ? undefined
              : () => {
                  openAddStopPicker('finish');
                }
          }
        />
        {!endpointsLocked ? (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Return to start location</Text>
            <Switch
              accessibilityLabel="Return to start location"
              onValueChange={(enabled) => {
                void onUpdateLocations({ returnToStart: enabled });
              }}
              trackColor={{ false: '#D1D5DB', true: AppColors.blue }}
              value={draft.returnToStart}
            />
          </View>
        ) : null}
      </View>

      <RoutePlanningSetRouteButton
        blockerMessage={routeSetBlockerMessage}
        disabled={routeSetDisabled}
        isCalculating={isCalculatingRoute}
        onPress={() => {
          onSetRoute?.();
        }}
        visible={hasStops && Boolean(onSetRoute)}
      />

      {planningSheets}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: PlanningLayout.sectionGap,
    width: '100%',
  },
  launcherBackRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 2,
    marginBottom: -8,
    minHeight: 44,
    paddingRight: 8,
  },
  launcherBackText: {
    color: AppColors.blue,
    fontSize: 17,
    fontWeight: '600',
  },
  finishBlock: {
    gap: 10,
    width: '100%',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 2,
  },
  toggleLabel: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    gap: PlanningLayout.contentGap,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerSideButton: {
    minHeight: 44,
    minWidth: 72,
    justifyContent: 'center',
  },
  sectionHeadingCenter: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: PlanningLayout.sectionTitleSize,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  cancelHeaderText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  doneHeaderText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  sectionHeading: {
    color: AppColors.textPrimary,
    fontSize: PlanningLayout.sectionTitleSize,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  emptySavedRouteButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  emptySavedRouteText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  addStopButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    justifyContent: 'center',
    paddingTop: 4,
  },
  addStopIcon: {
    marginTop: 1,
  },
  addStopText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  editPill: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editPillText: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
