import { StyleSheet, Text, View } from 'react-native';

import { WorkdayActionButton } from '@/components/home/workday-action-button';
import { AdaptiveRouteSummary } from '@/components/today/adaptive-route-summary';
import { BriefingStat } from '@/components/today/briefing-stat';
import { ImportantNotes } from '@/components/today/important-notes';
import { TodayRouteSelectionSection } from '@/components/today/today-route-selection-section';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import type { RouteEndpoint } from '@/types/route-endpoint';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import type { PreDayBriefing as PreDayBriefingData } from '@/utils/pre-day-briefing';
import { getTimeOfDayGreeting } from '@/utils/today-greeting';

type PreDayBriefingProps = {
  briefing: PreDayBriefingData;
  greeting?: string;
  isStarting: boolean;
  myLocations: SavedLocation[];
  onReturnToStartChange: (enabled: boolean) => void;
  onSaveToMyLocations: (input: {
    label: string;
    address: string;
  }) => Promise<SavedLocation>;
  onStartDay: () => void;
  onUpdateEnd: (endpoint: RouteEndpoint | null) => void;
  onUpdateStart: (endpoint: RouteEndpoint | null) => void;
  permissionDenied: boolean;
  routeSelection: TodayRouteSelection;
  startDayError?: string | null;
};

export function PreDayBriefing({
  briefing,
  greeting = getTimeOfDayGreeting(),
  isStarting,
  myLocations,
  onReturnToStartChange,
  onSaveToMyLocations,
  onStartDay,
  onUpdateEnd,
  onUpdateStart,
  permissionDenied,
  routeSelection,
  startDayError = null,
}: PreDayBriefingProps) {
  const startLabel = isStarting ? 'Starting Day…' : 'Start Day';

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.greeting}>{greeting}</Text>

        <View style={styles.statsRow}>
          <BriefingStat
            accessibilityLabel={`${briefing.totalStops} stops scheduled today`}
            label={briefing.totalStops === 1 ? 'Stop' : 'Stops'}
            value={briefing.totalStops}
          />
          {briefing.deliveryCount !== null ? (
            <BriefingStat
              accessibilityLabel={`${briefing.deliveryCount} deliveries scheduled today`}
              label={briefing.deliveryCount === 1 ? 'Delivery' : 'Deliveries'}
              value={briefing.deliveryCount}
            />
          ) : null}
          {briefing.priorityCount !== null ? (
            <BriefingStat
              accessibilityLabel={`${briefing.priorityCount} priority stops today`}
              label="Priority"
              value={briefing.priorityCount}
            />
          ) : null}
        </View>
      </View>

      <TodayRouteSelectionSection
        myLocations={myLocations}
        onReturnToStartChange={onReturnToStartChange}
        onSaveToMyLocations={onSaveToMyLocations}
        onUpdateEnd={onUpdateEnd}
        onUpdateStart={onUpdateStart}
        selection={routeSelection}
      />

      {briefing.route.routeSummary ? (
        <AdaptiveRouteSummary
          firstStopName={briefing.route.firstStop?.storeName ?? null}
          stopCount={briefing.totalStops}
          summary={briefing.route.routeSummary}
        />
      ) : null}

      {briefing.route.firstStop && !briefing.route.routeSummary ? (
        <View style={styles.firstStopCard}>
          <Text style={styles.firstStopLabel}>First stop</Text>
          <Text style={styles.firstStopName}>{briefing.route.firstStop.storeName}</Text>
        </View>
      ) : null}

      <ImportantNotes notes={briefing.importantNotes} />

      {!briefing.route.isRouteComplete ? (
        <Text style={styles.helper}>
          Route summary appears once start and end are selected. You can still start
          mileage tracking without a complete route.
        </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppSpacing.sectionGap,
  },
  heroCard: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  greeting: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-around',
    marginTop: 8,
  },
  firstStopCard: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  firstStopLabel: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  firstStopName: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  helper: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  error: {
    color: AppColors.red,
    fontSize: 15,
    textAlign: 'center',
  },
});
