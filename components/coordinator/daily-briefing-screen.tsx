import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BriefingRouteStopList } from '@/components/coordinator/briefing-route-stop-list';
import { RouteExperienceMap } from '@/components/coordinator/route-experience-map';
import { RouteMapCompactSummary } from '@/components/coordinator/route-map-compact-summary';
import { WorkdayActionButton } from '@/components/home/workday-action-button';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { BriefingPresentation } from '@/utils/briefing-presentation';
import type { DailyBriefingSummary } from '@/utils/planned-route-briefing';
import { buildPlanningRouteExperienceModel } from '@/utils/route-experience-map-model';
import { buildRouteMapStopRows } from '@/utils/route-map-utils';

type DailyBriefingScreenProps = {
  draft: RoutePlanningDraft;
  isStarting: boolean;
  onBackToPlanning: () => void;
  onBackToLauncher?: () => void;
  onOpenStore: (storeId: string) => void;
  onStartDay: () => void;
  permissionDenied: boolean;
  presentation: BriefingPresentation;
  startDayError?: string | null;
  storesById: Record<string, Store>;
  summary: DailyBriefingSummary;
  visits: StoreVisit[];
};

export function DailyBriefingScreen({
  draft,
  isStarting,
  onBackToPlanning,
  onBackToLauncher,
  onOpenStore,
  onStartDay,
  permissionDenied,
  presentation,
  startDayError = null,
  storesById,
  summary,
  visits,
}: DailyBriefingScreenProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const heroMapHeight = Math.round(
    Math.min(Math.max(windowHeight * 0.52, 320), windowHeight * 0.58),
  );

  const routeMapModel = useMemo(
    () =>
      buildPlanningRouteExperienceModel({
        draft,
        visits,
        storesById,
      }),
    [draft, storesById, visits],
  );

  const stopRows = useMemo(
    () => buildRouteMapStopRows({ storesById, visits }),
    [storesById, visits],
  );

  const startLabel = isStarting ? 'Starting Day…' : 'Start Day';

  return (
    <View style={[styles.container, isStarting && styles.startingDim]}>
      <Pressable accessibilityRole="button" onPress={onBackToPlanning}>
        <Text style={styles.backLink}>← Edit route</Text>
      </Pressable>
      {onBackToLauncher ? (
        <Pressable accessibilityRole="button" onPress={onBackToLauncher}>
          <Text style={styles.backLinkSecondary}>Back to launcher</Text>
        </Pressable>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today&apos;s Workday</Text>
        <Text style={styles.headerDate}>{summary.dateHeading}</Text>
      </View>

      {routeMapModel ? (
        <View style={styles.heroMapBlock}>
          <RouteExperienceMap
            mapHeight={heroMapHeight}
            mode="planning"
            model={routeMapModel}
            onOpenStore={onOpenStore}
            onSelectStop={setSelectedStoreId}
            selectedStoreId={selectedStoreId}
          />
          <RouteMapCompactSummary
            distanceLabel={summary.estimatedDistanceLabel}
            driveTimeLabel={summary.estimatedDriveTimeLabel}
            finishLabel={summary.estimatedFinishLabel}
            stopCount={summary.stopCount}
            variant="card"
          />
        </View>
      ) : null}

      {startDayError ? <Text style={styles.error}>{startDayError}</Text> : null}

      {permissionDenied ? (
        <Text style={styles.error}>
          Location access is required to track your workday.
        </Text>
      ) : null}

      <WorkdayActionButton
        accessibilityLabel={startLabel}
        disabled={isStarting}
        label={startLabel}
        onPress={onStartDay}
        variant="start"
      />

      {stopRows.length > 0 ? (
        <BriefingRouteStopList
          onSelectStop={setSelectedStoreId}
          rows={stopRows}
          selectedStoreId={selectedStoreId}
        />
      ) : null}

      {presentation.routeHealth ? (
        <Text
          accessibilityRole="text"
          style={[
            styles.routeHealth,
            presentation.routeHealth.status === 'needs_review'
              ? styles.routeHealthWarning
              : styles.routeHealthOk,
          ]}
        >
          {presentation.routeHealth.status === 'verified'
            ? '✓ All locations verified'
            : `⚠ ${presentation.routeHealth.count} location${presentation.routeHealth.count === 1 ? '' : 's'} need review`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppSpacing.sectionGap,
    paddingBottom: 8,
  },
  startingDim: {
    opacity: 0.88,
  },
  backLink: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '600',
  },
  backLinkSecondary: {
    color: AppColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  header: {
    gap: 4,
    paddingTop: 4,
  },
  headerTitle: {
    color: AppColors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerDate: {
    color: AppColors.textSecondary,
    fontSize: 16,
  },
  heroMapBlock: {
    gap: 10,
    width: '100%',
  },
  routeHealth: {
    fontSize: 14,
    fontWeight: '600',
    paddingTop: 4,
  },
  routeHealthOk: {
    color: AppColors.textSecondary,
  },
  routeHealthWarning: {
    color: '#B45309',
  },
  error: {
    color: AppColors.red,
    fontSize: 15,
    textAlign: 'center',
  },
});
