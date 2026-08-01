import { useMemo, useState, type ReactNode, type RefObject } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DeliveriesTodaySheet } from '@/components/active-workday/deliveries-today-sheet';
import { CompletedStopCard } from '@/components/stops/completed-stop-card';
import { RouteExperienceMap } from '@/components/coordinator/route-experience-map';
import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import { useDeliveriesScheduledToday } from '@/hooks/use-deliveries-scheduled-today';
import type { RouteLocation } from '@/types/route-location';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildActiveWorkdayLists,
  buildActiveWorkdayMetrics,
  sliceForPreview,
  type ActiveWorkdayStopRow,
} from '@/utils/active-workday-presentation';
import { formatPlanningRouteLocationDisplay } from '@/components/coordinator/planning-address-display';
import { openRouteLocationDirectionsSafely } from '@/utils/open-route-location-directions';
import type { RouteExperienceMapModel } from '@/utils/route-experience-map-model';
import {
  buildRouteStoreCardViewModel,
  mapLiveStopStateToVariant,
} from '@/utils/route-store-card-model';
import { resolveLiveStopPresentationState } from '@/utils/live-route-summary';
import { resolveNextVisit } from '@/services/store-visits';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ActiveWorkdayScreenProps = {
  currentVisitId: string | null;
  dateHeading: string;
  estimatedFinishAt: string | null;
  finishLocation: RouteLocation | null;
  fromStore: Store | null;
  mapHeight: number;
  mapModel: RouteExperienceMapModel | null;
  onAddStopForStore: (storeId: string) => void;
  onOpenMenu: () => void;
  onOpenStore: (storeId: string) => void;
  onScrollToTop?: () => void;
  routeStoreIds: string[];
  scrollPaddingBottom: number;
  scrollRef?: RefObject<ScrollView | null>;
  startLocation: RouteLocation | null;
  totalDistanceMiles: number;
  visits: StoreVisit[];
  workdayStartedAt: number | null;
  storesById: Record<string, Store>;
};

function SegmentProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <View accessibilityLabel={`${completed} of ${total} visits completed`} style={styles.segments}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={`seg-${index}`}
          style={[styles.segment, index < completed ? styles.segmentDone : styles.segmentTodo]}
        />
      ))}
    </View>
  );
}

function SectionHeader({
  chevron,
  color,
  count,
  icon,
  onPress,
  title,
}: {
  chevron: 'up' | 'down';
  color: string;
  count: number;
  icon: ReactNode;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>
        {title} ({count})
      </Text>
      <Ionicons
        color={AppColors.textMuted}
        name={chevron === 'up' ? 'chevron-up' : 'chevron-down'}
        size={18}
      />
    </Pressable>
  );
}

function RemainingStopRow({
  onPress,
  row,
}: {
  onPress: () => void;
  row: ActiveWorkdayStopRow;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.remainingRow,
        row.isNextStop && styles.remainingRowNext,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.timelineColumn}>
        <View style={[styles.timelineDot, row.isNextStop && styles.timelineDotNext]}>
          <Text style={[styles.timelineIndex, row.isNextStop && styles.timelineIndexNext]}>
            {row.globalIndex}
          </Text>
        </View>
      </View>
      <View style={styles.remainingCopy}>
        {row.isNextStop ? (
          <View style={styles.nextPill}>
            <Text style={styles.nextPillText}>NEXT STOP</Text>
          </View>
        ) : null}
        <Text style={styles.remainingName}>{row.storeName}</Text>
        <Text numberOfLines={2} style={styles.remainingAddress}>
          {row.address}
        </Text>
        <View style={styles.remainingMetaRow}>
          {row.milesLabel ? (
            <Text style={[styles.remainingMeta, row.isNextStop && styles.remainingMetaAccent]}>
              {row.milesLabel}
            </Text>
          ) : null}
          {row.etaLabel ? (
            <Text style={[styles.remainingMeta, row.isNextStop && styles.remainingMetaAccent]}>
              {row.etaLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

export function ActiveWorkdayScreen({
  currentVisitId,
  dateHeading,
  estimatedFinishAt,
  finishLocation,
  fromStore,
  mapHeight,
  mapModel,
  onAddStopForStore,
  onOpenMenu,
  onOpenStore,
  onScrollToTop,
  routeStoreIds,
  scrollPaddingBottom,
  scrollRef,
  startLocation,
  totalDistanceMiles,
  visits,
  workdayStartedAt,
  storesById,
}: ActiveWorkdayScreenProps) {
  const [mapExpanded, setMapExpanded] = useState(true);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [remainingExpanded, setRemainingExpanded] = useState(true);
  const [skippedExpanded, setSkippedExpanded] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllRemaining, setShowAllRemaining] = useState(false);
  const [showAllSkipped, setShowAllSkipped] = useState(false);
  const [deliveriesVisible, setDeliveriesVisible] = useState(false);

  const deliveries = useDeliveriesScheduledToday({
    enabled: true,
    routeStoreIds,
  });

  const metrics = useMemo(
    () =>
      buildActiveWorkdayMetrics({
        visits,
        totalDistanceMiles,
        workdayStartedAt,
        estimatedFinishAt,
        deliveriesScheduledToday: deliveries.count,
      }),
    [
      deliveries.count,
      estimatedFinishAt,
      totalDistanceMiles,
      visits,
      workdayStartedAt,
    ],
  );

  const lists = useMemo(
    () =>
      buildActiveWorkdayLists({
        visits,
        storesById,
        currentVisitId,
        startLocation,
      }),
    [currentVisitId, startLocation, storesById, visits],
  );

  const completedPreview = sliceForPreview(lists.completed, showAllCompleted);
  const remainingPreview = sliceForPreview(lists.remaining, showAllRemaining);
  const skippedPreview = sliceForPreview(lists.skipped, showAllSkipped);

  const nextVisitId = useMemo(() => {
    const currentVisit =
      currentVisitId !== null
        ? (visits.find((visit) => visit.id === currentVisitId) ?? null)
        : null;
    const nextVisit = resolveNextVisit(visits, currentVisit);

    return nextVisit?.status === 'pending' ? nextVisit.id : null;
  }, [currentVisitId, visits]);

  const completedViewModels = useMemo(() => {
    return completedPreview.flatMap((row) => {
      const visit = visits.find((entry) => entry.id === row.visitId);
      const store = visit ? storesById[visit.storeId] : null;

      if (!visit || !store) {
        return [];
      }

      const state = resolveLiveStopPresentationState({
        currentVisitId,
        visit,
      });
      const variant = mapLiveStopStateToVariant(state, {
        currentVisitId,
        nextVisitId: null,
        visitId: visit.id,
      });

      return [
        {
          storeId: store.id,
          viewModel: buildRouteStoreCardViewModel({
            currentVisitId,
            delivery: null,
            nextVisitId,
            startLocation,
            store,
            variant,
            visit,
            visits,
            storesById,
          }),
        },
      ];
    });
  }, [completedPreview, currentVisitId, nextVisitId, storesById, visits]);

  const finishDisplay = finishLocation
    ? formatPlanningRouteLocationDisplay(finishLocation, 'Set finish')
    : null;

  function toggleMap() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMapExpanded((value) => !value);
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollPaddingBottom },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      <View style={styles.headerBar}>
        <Pressable
          accessibilityLabel="Back to top"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onScrollToTop}
          style={styles.headerIcon}
        >
          <Ionicons color={AppColors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Active Workday</Text>
          <Text style={styles.headerDate}>{dateHeading}</Text>
        </View>
        <Pressable
          accessibilityLabel="Menu"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenMenu}
          style={styles.headerIcon}
        >
          <Ionicons color={AppColors.textPrimary} name="ellipsis-horizontal" size={22} />
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={toggleMap} style={styles.mapToggle}>
        <Ionicons color={AppColors.blue} name="map-outline" size={18} />
        <Text style={styles.mapToggleText}>
          {mapExpanded ? 'Hide map' : 'Show map'}
        </Text>
        <Ionicons
          color={AppColors.textMuted}
          name={mapExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
        />
      </Pressable>

      {mapExpanded && mapModel ? (
        <RouteExperienceMap
          mapHeight={mapHeight}
          mode="active"
          model={mapModel}
          onOpenStore={onOpenStore}
          showsUserLocation
        />
      ) : null}

      <SurfaceCard style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <Text style={styles.summaryPrimary}>
            {metrics.completedCount} of {metrics.totalCount} Visits Completed
          </Text>
          <Text style={styles.summaryPercent}>{metrics.percentComplete}% Complete</Text>
        </View>
        <SegmentProgress completed={metrics.completedCount} total={metrics.totalCount} />
        <View style={styles.metricsRow}>
          <MetricChip
            color={AppColors.blue}
            icon="navigate-outline"
            label={metrics.totalDistanceLabel}
          />
          <MetricChip
            color={AppColors.purple}
            icon="time-outline"
            label={metrics.elapsedLabel}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDeliveriesVisible(true);
            }}
            style={({ pressed }) => [styles.metricPressable, pressed && styles.pressed]}
          >
            <MetricChip
              color={AppColors.orange}
              icon="cube-outline"
              label={String(metrics.deliveriesScheduledToday)}
            />
          </Pressable>
          <MetricChip color={AppColors.green} icon="flag-outline" label={metrics.estTotalLabel} />
        </View>
      </SurfaceCard>

      {lists.completed.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            chevron={completedExpanded ? 'up' : 'down'}
            color={AppColors.green}
            count={lists.completed.length}
            icon={
              <View style={[styles.sectionIcon, { backgroundColor: AppColors.greenSoft }]}>
                <Ionicons color={AppColors.green} name="checkmark-circle" size={18} />
              </View>
            }
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setCompletedExpanded((value) => !value);
            }}
            title="Completed"
          />
          {completedExpanded
            ? completedViewModels.map((entry) => (
                <CompletedStopCard
                  key={entry.viewModel.id}
                  onPress={() => {
                    onOpenStore(entry.storeId);
                  }}
                  viewModel={entry.viewModel}
                />
              ))
            : null}
          {completedExpanded && lists.completed.length > 3 && !showAllCompleted ? (
            <Pressable onPress={() => setShowAllCompleted(true)}>
              <Text style={styles.viewAll}>
                View all {lists.completed.length} completed
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {lists.remaining.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            chevron={remainingExpanded ? 'up' : 'down'}
            color={AppColors.blue}
            count={lists.remaining.length}
            icon={
              <View style={[styles.sectionIcon, styles.sectionIconRemaining]}>
                <View style={styles.sectionIconRing} />
              </View>
            }
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setRemainingExpanded((value) => !value);
            }}
            title="Remaining"
          />
          {remainingExpanded ? (
            <View style={styles.timelineList}>
              {remainingPreview.map((row) => (
                <RemainingStopRow
                  key={row.visit.id}
                  onPress={() => {
                    onOpenStore(row.storeId);
                  }}
                  row={row}
                />
              ))}
            </View>
          ) : null}
          {remainingExpanded && lists.remaining.length > 3 && !showAllRemaining ? (
            <Pressable onPress={() => setShowAllRemaining(true)}>
              <Text style={styles.viewAll}>
                View all {lists.remaining.length} remaining
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {finishLocation ? (
        <SurfaceCard style={styles.finishCard}>
          <View style={styles.finishCopy}>
            <Text style={styles.finishKicker}>Finish</Text>
            <Text numberOfLines={1} style={styles.finishPrimary}>
              {finishDisplay?.primary ?? 'Finish location'}
            </Text>
            {finishDisplay?.secondary ? (
              <Text numberOfLines={2} style={styles.finishSecondary}>
                {finishDisplay.secondary}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              openRouteLocationDirectionsSafely(finishLocation);
            }}
            style={({ pressed }) => [styles.navigateButton, pressed && styles.pressed]}
          >
            <Ionicons color="#FFFFFF" name="navigate" size={18} />
            <Text style={styles.navigateLabel}>Navigate</Text>
          </Pressable>
        </SurfaceCard>
      ) : null}

      {lists.skipped.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            chevron={skippedExpanded ? 'up' : 'down'}
            color={AppColors.orange}
            count={lists.skipped.length}
            icon={
              <View style={[styles.sectionIcon, { backgroundColor: AppColors.orangeSoft }]}>
                <Ionicons color={AppColors.orange} name="remove-circle" size={18} />
              </View>
            }
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSkippedExpanded((value) => !value);
            }}
            title="Skipped"
          />
          {skippedExpanded
            ? skippedPreview.map((row) => (
                <View key={row.visitId} style={styles.skippedRow}>
                  <Ionicons color={AppColors.orange} name="albums-outline" size={18} />
                  <View style={styles.skippedCopy}>
                    <Text style={styles.skippedName}>{row.storeName}</Text>
                    <Text style={styles.skippedAddress}>{row.address}</Text>
                    {row.reasonLabel ? (
                      <Text style={styles.skippedReason}>{row.reasonLabel}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            : null}
        </View>
      ) : null}

      <DeliveriesTodaySheet
        isLoading={deliveries.isLoading}
        onAddStopSuggestion={(storeId) => {
          setDeliveriesVisible(false);
          onAddStopForStore(storeId);
        }}
        onClose={() => {
          setDeliveriesVisible(false);
        }}
        rows={deliveries.rows}
        visible={deliveriesVisible}
      />
    </ScrollView>
  );
}

function MetricChip({
  color,
  icon,
  label,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metricChip}>
      <Ionicons color={color} name={icon} size={16} />
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    paddingTop: 8,
  },
  headerBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerDate: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  mapToggleText: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCard: {
    gap: 12,
  },
  summaryTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryPrimary: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryPercent: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '800',
  },
  segments: {
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    borderRadius: 3,
    flex: 1,
    height: 8,
    minWidth: 4,
  },
  segmentDone: {
    backgroundColor: AppColors.blue,
  },
  segmentTodo: {
    backgroundColor: MileMateTokens.backgroundElevated,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  metricPressable: {
    borderRadius: 8,
    flex: 1,
    minWidth: 0,
  },
  metricChip: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  metricLabel: {
    color: AppColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  sectionIconRemaining: {
    backgroundColor: AppColors.blueSoft,
  },
  sectionIconRing: {
    borderColor: AppColors.blue,
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  sectionTitle: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  timelineList: {
    gap: 10,
    paddingLeft: 4,
  },
  remainingRow: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  remainingRowNext: {
    borderColor: AppColors.blue,
    borderWidth: 1.5,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 36,
  },
  timelineDot: {
    alignItems: 'center',
    borderColor: AppColors.textMuted,
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  timelineDotNext: {
    backgroundColor: AppColors.blue,
    borderColor: AppColors.blue,
  },
  timelineIndex: {
    color: AppColors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineIndexNext: {
    color: '#FFFFFF',
  },
  remainingCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nextPill: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nextPillText: {
    color: AppColors.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  remainingName: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  remainingAddress: {
    color: AppColors.textSecondary,
    fontSize: 13,
  },
  remainingMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  remainingMeta: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  remainingMetaAccent: {
    color: AppColors.blue,
  },
  finishCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  finishCopy: {
    flex: 1,
    gap: 2,
  },
  finishKicker: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  finishPrimary: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  finishSecondary: {
    color: AppColors.textSecondary,
    fontSize: 13,
  },
  navigateButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navigateLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  skippedRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  skippedCopy: {
    flex: 1,
    gap: 2,
  },
  skippedName: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  skippedAddress: {
    color: AppColors.textMuted,
    fontSize: 12,
  },
  skippedReason: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  viewAll: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.88,
  },
});
