import { useMemo, type RefObject } from 'react';

import { usePlanningDrivingPolyline } from '@/hooks/use-planning-driving-polyline';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BuildRouteAddStopButton } from '@/components/coordinator/build-route-add-stop-button';
import { BuildRouteHeader } from '@/components/coordinator/build-route-header';
import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { BuildRouteMapSummaryBar } from '@/components/coordinator/build-route-map-summary-bar';
import { BuildRouteRouteCard } from '@/components/coordinator/build-route-route-card';
import { BuildRouteSetRouteFooter } from '@/components/coordinator/build-route-set-route-footer';
import { BuildRouteStopList } from '@/components/coordinator/build-route-stop-list';
import { RouteExperienceMap } from '@/components/coordinator/route-experience-map';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteLocation } from '@/types/route-location';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { buildPlanningRouteExperienceModel } from '@/utils/route-experience-map-model';

type BuildRoutePlanningScreenProps = {
  blockerMessage?: string | null;
  distanceLabel: string;
  draft: RoutePlanningDraft;
  finishLocation: RouteLocation | null;
  hasStops: boolean;
  isCalculatingRoute: boolean;
  onAddStop: () => void;
  onBack: () => void;
  onOpenMenu?: () => void;
  onPressFinish?: () => void;
  onPressStart?: () => void;
  onPressStop: (storeId: string) => void;
  onRemoveStop: (visitId: string, stopName: string) => void;
  onReorderStops: (orderedVisitIds: string[]) => void;
  onSetRoute?: () => void;
  /** Measured by host to scroll Add Stop into view after new stops. */
  addStopAnchorRef?: RefObject<View | null>;
  routeSetDisabled: boolean;
  stopsLabel: string;
  storesById: Record<string, Store>;
  timeLabel: string;
  visits: StoreVisit[];
};

export function BuildRoutePlanningScreen({
  blockerMessage,
  distanceLabel,
  draft,
  finishLocation,
  hasStops,
  isCalculatingRoute,
  onAddStop,
  onBack,
  onOpenMenu,
  onPressFinish,
  onPressStart,
  onPressStop,
  onRemoveStop,
  onReorderStops,
  onSetRoute,
  addStopAnchorRef,
  routeSetDisabled,
  stopsLabel,
  storesById,
  timeLabel,
  visits,
}: BuildRoutePlanningScreenProps) {
  const { height: windowHeight } = useWindowDimensions();
  const mapHeight = Math.round(windowHeight * BuildRouteLayout.mapHeightRatio);

  const previewDrivingPolyline = usePlanningDrivingPolyline({
    draft,
    enabled: hasStops && !isCalculatingRoute,
    storesById,
    visits,
  });

  const mapDraft = useMemo(
    (): RoutePlanningDraft =>
      previewDrivingPolyline && previewDrivingPolyline.length >= 2
        ? { ...draft, drivingPolyline: previewDrivingPolyline }
        : draft,
    [draft, previewDrivingPolyline],
  );

  const mapModel = useMemo(
    () =>
      buildPlanningRouteExperienceModel({
        draft: mapDraft,
        storesById,
        visits,
      }),
    [mapDraft, storesById, visits],
  );

  return (
    <View style={styles.container}>
      <BuildRouteHeader onBack={onBack} onOpenMenu={onOpenMenu} />

      <View style={styles.mapColumn}>
        <View style={[styles.mapSection, { height: mapHeight }]}>
          {mapModel ? (
            <RouteExperienceMap
              mapHeight={mapHeight}
              mode="planning"
              model={mapModel}
              onOpenStore={() => {
                // Store detail wiring in a later feature pass.
              }}
            />
          ) : (
            <View style={[styles.mapFallback, { height: mapHeight }]} />
          )}

          <View pointerEvents="box-none" style={styles.mapOverlayTop}>
            <View style={styles.mapTools}>
              <Pressable accessibilityLabel="Recenter map" accessibilityRole="button" style={styles.mapTool}>
                <Ionicons color={AppColors.textPrimary} name="navigate-outline" size={20} />
              </Pressable>
              <Pressable accessibilityLabel="Map layers" accessibilityRole="button" style={styles.mapTool}>
                <Ionicons color={AppColors.textPrimary} name="layers-outline" size={20} />
              </Pressable>
            </View>
          </View>
        </View>

        <BuildRouteMapSummaryBar
          attached
          distanceLabel={distanceLabel}
          routeScopeHint="Includes return to Finish"
          stopsLabel={stopsLabel}
          timeLabel={timeLabel}
        />
      </View>

      <View style={styles.routeStack}>
        <View style={styles.connectedRouteList}>
          <BuildRouteRouteCard
            kind="start"
            location={draft.startLocation}
            onPress={onPressStart}
          />

          {hasStops ? (
            <BuildRouteStopList
              onPressStop={onPressStop}
              onRemove={onRemoveStop}
              onReorder={onReorderStops}
              startLocation={draft.startLocation}
              storesById={storesById}
              visits={visits}
            />
          ) : (
            <Text style={styles.emptyHint}>No stops added yet</Text>
          )}

          <BuildRouteRouteCard
            kind="finish"
            location={finishLocation}
            onPress={onPressFinish}
            returnToStart={draft.returnToStart}
          />
        </View>

        <View ref={addStopAnchorRef} collapsable={false}>
          <BuildRouteAddStopButton onPress={onAddStop} />
        </View>
      </View>

      {onSetRoute ? (
        <BuildRouteSetRouteFooter
          blockerMessage={blockerMessage}
          disabled={routeSetDisabled}
          isCalculating={isCalculatingRoute}
          onPress={onSetRoute}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: BuildRouteLayout.screenSectionGap,
    width: '100%',
  },
  mapColumn: {
    borderColor: AppColors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '100%',
  },
  mapSection: {
    overflow: 'hidden',
    width: '100%',
  },
  mapFallback: {
    backgroundColor: AppColors.backgroundElevated,
    width: '100%',
  },
  mapOverlayTop: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  mapTools: {
    gap: 8,
  },
  mapTool: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 14, 20, 0.88)',
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  routeStack: {
    gap: BuildRouteLayout.screenSectionGap,
    width: '100%',
  },
  connectedRouteList: {
    gap: BuildRouteLayout.routeListConnectedGap,
    width: '100%',
  },
  emptyHint: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
