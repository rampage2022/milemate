import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { RouteExperienceMap } from '@/components/coordinator/route-experience-map';
import { RouteCompleteOutcomeCounts } from '@/components/coordinator/route-complete-outcome-counts';
import { WorkdayActionButton } from '@/components/home/workday-action-button';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import { useRouteCompleteViewModel } from '@/hooks/use-route-complete-view-model';
import {
  playRouteCompleteSuccessHaptic,
  playRouteCompleteSuccessSound,
} from '@/services/route-complete-feedback';
import {
  formatRouteCompletionTime,
  type RouteCompleteSummaryPresentation,
} from '@/utils/route-complete-summary';

const BLUR_INTENSITY = Platform.OS === 'ios' ? 48 : 64;
const CHECKMARK_SPRING = { damping: 16, mass: 0.85, stiffness: 220 };

type RouteCompleteScreenProps = {
  finishError?: string | null;
  isFinishing: boolean;
  onFinishWorkday: () => void;
  onOpenStore: (storeId: string) => void;
};

function MetricGrid({
  metrics,
}: {
  metrics: RouteCompleteSummaryPresentation['metrics'];
}) {
  const pairs = [
    [metrics[0], metrics[1]],
    [metrics[2], metrics[3]],
  ].filter((row) => row[0] && row[1]) as Array<
    [RouteCompleteSummaryPresentation['metrics'][number], RouteCompleteSummaryPresentation['metrics'][number]]
  >;

  return (
    <View style={styles.metricGrid}>
      {pairs.map(([left, right]) => (
        <View key={`${left.id}-${right.id}`} style={styles.metricRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{left.value}</Text>
            <Text style={styles.metricLabel}>{left.label}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{right.value}</Text>
            <Text style={styles.metricLabel}>{right.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function RouteCompleteScreen({
  finishError = null,
  isFinishing,
  onFinishWorkday,
  onOpenStore,
}: RouteCompleteScreenProps) {
  const { height: windowHeight } = useWindowDimensions();
  const { error, isLoading, viewModel } = useRouteCompleteViewModel(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const celebrationStartedRef = useRef(false);
  const feedbackPlayedRef = useRef(false);

  const mapHeight = Math.round(Math.min(Math.max(windowHeight * 0.28, 230), 280));
  const presentation = viewModel?.presentation ?? null;
  const routeMapModel = viewModel?.mapModel ?? null;

  const backdropOpacity = useSharedValue(0);
  const checkmarkScale = useSharedValue(0.88);
  const checkmarkOpacity = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const bodyOpacity = useSharedValue(0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!presentation || celebrationStartedRef.current) {
      return;
    }

    celebrationStartedRef.current = true;

    if (reduceMotion) {
      backdropOpacity.value = 1;
      checkmarkOpacity.value = 1;
      checkmarkScale.value = 1;
      heroOpacity.value = 1;
      bodyOpacity.value = 1;
      if (!feedbackPlayedRef.current) {
        feedbackPlayedRef.current = true;
        playRouteCompleteSuccessHaptic();
      }
      void playRouteCompleteSuccessSound();
      return;
    }

    backdropOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    checkmarkOpacity.value = withDelay(100, withTiming(1, { duration: 220 }));
    checkmarkScale.value = withDelay(
      100,
      withSpring(1, CHECKMARK_SPRING, (finished) => {
        if (finished && !feedbackPlayedRef.current) {
          feedbackPlayedRef.current = true;
          runOnJS(playRouteCompleteSuccessHaptic)();
        }
      }),
    );

    const soundTimer = setTimeout(() => {
      void playRouteCompleteSuccessSound();
    }, 380);

    heroOpacity.value = withDelay(
      280,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
    bodyOpacity.value = withDelay(
      420,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );

    return () => {
      clearTimeout(soundTimer);
    };
  }, [backdropOpacity, bodyOpacity, checkmarkOpacity, checkmarkScale, heroOpacity, presentation, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
    transform: [{ scale: checkmarkScale.value }],
  }));

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
  }));

  if (isLoading || !presentation) {
    return (
      <View style={styles.root}>
        <View style={styles.loadingPlaceholder}>
          {isLoading ? (
            <ActivityIndicator color={AppColors.blue} size="large" />
          ) : (
            <Text style={styles.loadingText}>{error ?? 'Route summary unavailable.'}</Text>
          )}
        </View>
      </View>
    );
  }

  const completionTimeLabel = formatRouteCompletionTime(presentation.routeCompletedAtMs);

  return (
    <View accessibilityLabel="Route completion summary" accessibilityRole="summary" style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]}>
        <BlurView
          experimentalBlurMethod={
            Platform.OS === 'android' ? 'dimezisBlurView' : undefined
          }
          intensity={BLUR_INTENSITY}
          style={StyleSheet.absoluteFill}
          tint="light"
        />
        <View style={styles.backdropTint} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.heroBlock, heroStyle]}>
          <Animated.View
            accessibilityLabel="Route completion success"
            accessibilityRole="image"
            style={[styles.checkmarkCircle, checkmarkStyle]}
          >
            <Ionicons color="#FFFFFF" name="checkmark" size={44} />
          </Animated.View>

          <Text accessibilityRole="header" style={styles.title}>
            {presentation.title}
          </Text>
          <Text style={styles.completionTime}>Completed at {completionTimeLabel}</Text>
        </Animated.View>

        <Animated.View style={[styles.bodyBlock, bodyStyle]}>
          {routeMapModel ? (
            <RouteExperienceMap
              mapHeight={mapHeight}
              mode="complete"
              model={routeMapModel}
              onOpenStore={onOpenStore}
              onSelectStop={setSelectedStoreId}
              selectedStoreId={selectedStoreId}
            />
          ) : null}

          <View style={styles.achievementCard}>
            {presentation.achievement.useOutcomeCounts ? (
              <RouteCompleteOutcomeCounts outcomes={presentation.outcomes} />
            ) : (
              <Text style={styles.achievementPrimary}>{presentation.achievement.primaryLine}</Text>
            )}
            {presentation.achievement.secondaryLine ? (
              <Text style={styles.achievementSecondary}>
                {presentation.achievement.secondaryLine}
              </Text>
            ) : null}
          </View>

          <View style={styles.metricsCard}>
            <MetricGrid metrics={presentation.metrics} />
          </View>

          <Text style={styles.encouragement}>{presentation.encouragement}</Text>

          {finishError ? <Text style={styles.error}>{finishError}</Text> : null}
        </Animated.View>

        <View style={styles.buttonWrap}>
          <WorkdayActionButton
            disabled={isFinishing}
            label={isFinishing ? 'Finishing…' : 'Finish Workday'}
            onPress={onFinishWorkday}
            variant="complete"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: AppSpacing.cardRadius,
    maxHeight: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  loadingPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(243, 244, 246, 0.72)',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 4,
    paddingTop: 16,
  },
  heroBlock: {
    alignItems: 'center',
    gap: 8,
  },
  bodyBlock: {
    gap: 14,
  },
  checkmarkCircle: {
    alignItems: 'center',
    backgroundColor: AppColors.green,
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    shadowColor: AppColors.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    width: 88,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  completionTime: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  achievementCard: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  achievementPrimary: {
    color: AppColors.textPrimary,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'center',
  },
  achievementSecondary: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metricsCard: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricGrid: {
    gap: 14,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCell: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  metricValue: {
    color: AppColors.textPrimary,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  metricLabel: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  encouragement: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  error: {
    color: AppColors.red,
    fontSize: 15,
    textAlign: 'center',
  },
  buttonWrap: {
    marginTop: 4,
    width: '100%',
  },
});
