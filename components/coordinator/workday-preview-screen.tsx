import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { RouteExperienceMap } from '@/components/coordinator/route-experience-map';
import { WorkdayPreviewLayout } from '@/components/coordinator/workday-preview-layout';
import { formatPersonalizedGreeting } from '@/components/redesign/format-greeting';
import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import { HomeColors } from '@/components/home/theme';
import { AppColors } from '@/components/shared/app-theme';
import { useWorkdayPreviewInsights } from '@/hooks/use-workday-preview-insights';
import { getAutoCheckInMode } from '@/services/workflow-preferences';
import type { AutoCheckInMode } from '@/types/auto-check-in';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import type { RoutePlanningDraft } from '@/types/route-planning';
import type { BriefingPresentation } from '@/utils/briefing-presentation';
import type { DailyBriefingSummary } from '@/utils/planned-route-briefing';
import { buildPlanningRouteExperienceModel } from '@/utils/route-experience-map-model';
import {
  buildWorkdayPreviewChecklist,
  buildWorkdayPreviewStatLabels,
  formatWorkdayPreviewStartTime,
} from '@/utils/workday-preview-model';
import type { WorkdayPreviewInsightRow } from '@/services/workday-preview-insights';

type WorkdayPreviewScreenProps = {
  displayName?: string | null;
  draft: RoutePlanningDraft;
  isStarting: boolean;
  onBackToPlanning: () => void;
  onInsightPress?: (row: WorkdayPreviewInsightRow) => void;
  onOpenMenu?: () => void;
  onOpenStore: (storeId: string) => void;
  onStartDay: () => void;
  permissionDenied: boolean;
  presentation: BriefingPresentation;
  startDayError?: string | null;
  storesById: Record<string, Store>;
  summary: DailyBriefingSummary;
  visits: StoreVisit[];
};

type StatTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  primary: string;
  style?: StyleProp<ViewStyle>;
  subtitle: string;
  title: string;
};

function StatTile({
  icon,
  iconBackground,
  primary,
  style,
  subtitle,
  title,
}: StatTileProps) {
  return (
    <SurfaceCard padded style={[styles.statTile, style]}>
      <View style={[styles.statIconRing, { backgroundColor: iconBackground }]}>
        <Ionicons color="#FFFFFF" name={icon} size={20} />
      </View>
      <Text style={styles.statPrimary}>{primary}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </SurfaceCard>
  );
}

function ChecklistItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <View style={styles.checklistItem}>
      <Ionicons
        color={ready ? AppColors.green : AppColors.textMuted}
        name={ready ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
      />
      <Text style={[styles.checklistLabel, !ready && styles.checklistLabelMuted]}>{label}</Text>
    </View>
  );
}

export function WorkdayPreviewScreen({
  displayName = null,
  draft,
  isStarting,
  onBackToPlanning,
  onInsightPress,
  onOpenMenu,
  onOpenStore,
  onStartDay,
  permissionDenied,
  presentation,
  startDayError = null,
  storesById,
  summary,
  visits,
}: WorkdayPreviewScreenProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [autoCheckInMode, setAutoCheckInMode] = useState<AutoCheckInMode>('ask');
  const [startTimeLabel] = useState(() => formatWorkdayPreviewStartTime());

  const mapHeight = Math.round(
    Math.min(
      Math.max(windowHeight * WorkdayPreviewLayout.mapHeightRatio, WorkdayPreviewLayout.mapMinHeight),
      WorkdayPreviewLayout.mapMaxHeight,
    ),
  );

  const routeStoreIds = useMemo(() => visits.map((visit) => visit.storeId), [visits]);
  const { insights } = useWorkdayPreviewInsights(routeStoreIds);

  useEffect(() => {
    void getAutoCheckInMode().then(setAutoCheckInMode);
  }, []);

  const routeMapModel = useMemo(
    () =>
      buildPlanningRouteExperienceModel({
        draft,
        visits,
        storesById,
      }),
    [draft, storesById, visits],
  );

  const statLabels = useMemo(() => buildWorkdayPreviewStatLabels(summary), [summary]);
  const checklist = useMemo(
    () =>
      buildWorkdayPreviewChecklist({
        autoCheckInMode,
        presentation,
        stopCount: summary.stopCount,
      }),
    [autoCheckInMode, presentation, summary.stopCount],
  );

  const startLabel = isStarting ? 'Starting Day…' : 'Start Day';
  const finishTimeLabel = summary.estimatedFinishLabel.startsWith('~')
    ? summary.estimatedFinishLabel
    : `~${summary.estimatedFinishLabel}`;

  return (
    <View style={[styles.container, isStarting && styles.startingDim]}>
      <View style={styles.navRow}>
        <Pressable
          accessibilityLabel="Back to edit route"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBackToPlanning}
          style={({ pressed }) => [styles.navIconButton, pressed && styles.pressed]}
        >
          <Ionicons color={AppColors.textPrimary} name="chevron-back" size={24} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.navTitle}>
          Workday Preview
        </Text>
        <Pressable
          accessibilityLabel="More options"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenMenu}
          style={({ pressed }) => [styles.navIconButton, pressed && styles.pressed]}
        >
          <Ionicons color={AppColors.textSecondary} name="ellipsis-horizontal" size={22} />
        </Pressable>
      </View>

      <View style={styles.greetingRow}>
        <Text style={styles.sunGlyph} accessibilityElementsHidden>
          ☀️
        </Text>
        <View style={styles.greetingCopy}>
          <Text style={styles.greetingTitle}>{formatPersonalizedGreeting(displayName)}!</Text>
          <Text style={styles.greetingSubtitle}>Everything looks ready for a great day.</Text>
        </View>
      </View>

      {routeMapModel ? (
        <View style={[styles.mapShell, { height: mapHeight }]}>
          <RouteExperienceMap
            mapHeight={mapHeight}
            mode="planning"
            model={routeMapModel}
            onOpenStore={onOpenStore}
            onSelectStop={setSelectedStoreId}
            selectedStoreId={selectedStoreId}
          />
          <View pointerEvents="none" style={styles.mapOverlayTop}>
            <View style={styles.mapEndpointBadge}>
              <Ionicons color={AppColors.blue} name="location" size={16} />
              <View style={styles.mapEndpointCopy}>
                <Text numberOfLines={1} style={styles.mapEndpointTitle}>
                  Start: {summary.startLabel}
                </Text>
                <Text style={styles.mapEndpointMeta}>{startTimeLabel}</Text>
              </View>
            </View>
            <View style={styles.mapEndpointBadge}>
              <Ionicons color="#A78BFA" name="flag" size={16} />
              <View style={styles.mapEndpointCopy}>
                <Text numberOfLines={1} style={styles.mapEndpointTitle}>
                  Finish: {summary.endLabel}
                </Text>
                <Text style={styles.mapEndpointMeta}>{finishTimeLabel}</Text>
              </View>
            </View>
          </View>
          <View pointerEvents="none" style={styles.mapStopsPill}>
            <Ionicons color={AppColors.blue} name="git-network-outline" size={14} />
            <Text style={styles.mapStopsPillText}>
              {summary.stopCount} {summary.stopCount === 1 ? 'Stop' : 'Stops'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.statGrid}>
        <StatTile
          icon="storefront-outline"
          iconBackground="rgba(34, 197, 94, 0.22)"
          primary={statLabels.stopsPrimary}
          style={styles.statCell}
          subtitle={statLabels.stopsSubtitle}
          title="Total Stops"
        />
        <StatTile
          icon="cube-outline"
          iconBackground="rgba(249, 115, 22, 0.22)"
          primary={String(insights.deliveriesScheduledToday)}
          style={styles.statCell}
          subtitle="Scheduled today"
          title="Deliveries"
        />
        <StatTile
          icon="map-outline"
          iconBackground="rgba(59, 130, 246, 0.22)"
          primary={statLabels.mileagePrimary}
          style={styles.statCell}
          subtitle={statLabels.mileageSubtitle}
          title="Est. Mileage"
        />
        <StatTile
          icon="time-outline"
          iconBackground="rgba(167, 139, 250, 0.22)"
          primary={statLabels.timePrimary}
          style={styles.statCell}
          subtitle={statLabels.timeSubtitle}
          title="Est. Time"
        />
      </View>

      {insights.thingsToKnow.length > 0 ? (
        <SurfaceCard style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons color="#F59E0B" name="warning-outline" size={20} />
            <Text style={styles.sectionHeading}>Things to Know</Text>
          </View>
          {insights.thingsToKnow.map((row, index) => (
            <View key={row.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onInsightPress?.(row);
                }}
                style={({ pressed }) => [styles.insightRow, pressed && styles.pressed]}
              >
                <Ionicons
                  color={row.kind === 'missed_deliveries' ? AppColors.red : AppColors.blue}
                  name={row.kind === 'missed_deliveries' ? 'car-outline' : 'chatbox-ellipses-outline'}
                  size={22}
                />
                <View style={styles.insightCopy}>
                  <Text style={styles.insightTitle}>{row.title}</Text>
                  <Text style={styles.insightSubtitle}>{row.subtitle}</Text>
                </View>
                <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
              </Pressable>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeadingRow}>
          <Ionicons color={AppColors.green} name="checkmark-circle" size={22} />
          <Text style={styles.sectionHeading}>You&apos;re All Set</Text>
        </View>
        <View style={styles.checklistGrid}>
          {checklist.map((item) => (
            <ChecklistItem key={item.id} label={item.label} ready={item.ready} />
          ))}
        </View>
      </SurfaceCard>

      {startDayError ? <Text style={styles.error}>{startDayError}</Text> : null}

      {permissionDenied ? (
        <Text style={styles.error}>Location access is required to track your workday.</Text>
      ) : null}

      <Pressable
        accessibilityLabel={startLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isStarting, busy: isStarting }}
        disabled={isStarting}
        onPress={onStartDay}
        style={({ pressed }) => [
          styles.startButton,
          isStarting && styles.startButtonDisabled,
          pressed && !isStarting && styles.pressed,
        ]}
      >
        <Ionicons color="#FFFFFF" name="play" size={18} style={styles.startPlayIcon} />
        <Text style={styles.startButtonLabel}>{startLabel}</Text>
      </Pressable>

      <View style={styles.startCaptionRow}>
        <Ionicons color={AppColors.textMuted} name="lock-closed-outline" size={14} />
        <Text style={styles.startCaption}>
          Workday will begin and navigation to first stop will open.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: WorkdayPreviewLayout.contentGap,
    paddingBottom: 8,
    width: '100%',
  },
  startingDim: {
    opacity: 0.88,
  },
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  navIconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  navTitle: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: WorkdayPreviewLayout.headerTitleSize,
    fontWeight: '700',
    textAlign: 'center',
  },
  greetingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  sunGlyph: {
    fontSize: 36,
  },
  greetingCopy: {
    flex: 1,
    gap: 4,
  },
  greetingTitle: {
    color: AppColors.textPrimary,
    fontSize: WorkdayPreviewLayout.greetingTitleSize,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  greetingSubtitle: {
    color: AppColors.textSecondary,
    fontSize: WorkdayPreviewLayout.greetingSubtitleSize,
    lineHeight: 20,
  },
  mapShell: {
    borderRadius: WorkdayPreviewLayout.mapRadius,
    overflow: 'hidden',
    width: '100%',
  },
  mapOverlayTop: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    left: 10,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  mapEndpointBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 14, 20, 0.88)',
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    maxWidth: '48%',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mapEndpointCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  mapEndpointTitle: {
    color: AppColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  mapEndpointMeta: {
    color: AppColors.textSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  mapStopsPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 14, 20, 0.88)',
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 10,
    flexDirection: 'row',
    gap: 6,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
  },
  mapStopsPillText: {
    color: AppColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: WorkdayPreviewLayout.statGridGap,
  },
  statCell: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: '46%',
  },
  statTile: {
    gap: 6,
    minHeight: 118,
  },
  statIconRing: {
    alignItems: 'center',
    borderRadius: 20,
    height: WorkdayPreviewLayout.statIconSize,
    justifyContent: 'center',
    width: WorkdayPreviewLayout.statIconSize,
  },
  statPrimary: {
    color: AppColors.textPrimary,
    fontSize: WorkdayPreviewLayout.statValueSize,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statTitle: {
    color: AppColors.textPrimary,
    fontSize: WorkdayPreviewLayout.statLabelSize,
    fontWeight: '700',
  },
  statSubtitle: {
    color: AppColors.textSecondary,
    fontSize: WorkdayPreviewLayout.statSubtitleSize,
    lineHeight: 16,
  },
  sectionCard: {
    gap: 12,
  },
  sectionHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sectionHeading: {
    color: AppColors.textPrimary,
    fontSize: WorkdayPreviewLayout.sectionTitleSize,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: AppColors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  insightRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  insightCopy: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  insightSubtitle: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  checklistItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flexBasis: '48%',
    gap: 8,
    minWidth: '46%',
  },
  checklistLabel: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: WorkdayPreviewLayout.checklistItemSize,
    fontWeight: '600',
  },
  checklistLabelMuted: {
    color: AppColors.textSecondary,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: HomeColors.startButton,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  startButtonDisabled: {
    opacity: 0.55,
  },
  startPlayIcon: {
    marginRight: 8,
  },
  startButtonLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  startCaptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  startCaption: {
    color: AppColors.textMuted,
    flex: 1,
    fontSize: WorkdayPreviewLayout.footerCaptionSize,
    lineHeight: 16,
    textAlign: 'center',
  },
  error: {
    color: AppColors.red,
    fontSize: 15,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
