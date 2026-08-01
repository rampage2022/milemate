import { type ReactNode } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  HOME_ACTION_CARD_GRADIENTS,
  type HomeActionCardVariant,
} from '@/components/home/home-action-card-gradients';
import { FadeInView } from '@/components/redesign/fade-in-view';
import { formatPersonalizedGreeting } from '@/components/redesign/format-greeting';
import { SurfaceCard } from '@/components/redesign/primitives/surface-card';
import {
  HomeLayout,
} from '@/components/home/home-layout';
import { HomeIcon } from '@/components/home/home-icon';
import type { HomeIconToken } from '@/components/home/home-icon-tokens';
import { formatHomeStartLocationLines } from '@/components/coordinator/planning-address-display';
import {
  AppColors,
  AppShadows,
} from '@/components/shared/app-theme';
import { useHomeWeather } from '@/hooks/use-home-weather';
import type { RouteLocation } from '@/types/route-location';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import { resolveHomeStartLocationDisplay } from '@/utils/home-start-location-display';

function defaultMapsAppLabel(): string {
  return Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps';
}

type HomeIdleActionProps = {
  accessibilityLabel: string;
  description: string;
  icon: HomeIconToken;
  onPress: () => void;
  title: string;
  variant: HomeActionCardVariant;
};

function HomeIdleAction({
  accessibilityLabel,
  description,
  icon,
  onPress,
  title,
  variant,
}: HomeIdleActionProps) {
  const gradient = HOME_ACTION_CARD_GRADIENTS[variant];
  const accentColor = gradient.accentColor;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCardOuter,
        { borderColor: accentColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.actionCardInner}>
        <View style={styles.actionCardContent}>
          <View style={[styles.actionIconWrap, { backgroundColor: `${accentColor}22` }]}>
            <HomeIcon color={accentColor} name={icon} size={HomeLayout.actionIconGlyphSize} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionDescription}>{description}</Text>
          </View>
          <HomeIcon
            color={accentColor}
            name="actionChevron"
            size={HomeLayout.actionChevronSize}
          />
        </View>
      </View>
    </Pressable>
  );
};

type StatusColumnProps = {
  children: ReactNode;
  showDivider?: boolean;
};

function StatusColumn({ children, showDivider = true }: StatusColumnProps) {
  return (
    <>
      <View style={styles.statusColumn}>{children}</View>
      {showDivider ? <View style={styles.statusDivider} /> : null}
    </>
  );
}

type HomeIdleScreenProps = {
  displayName?: string | null;
  myLocations: SavedLocation[];
  planningStartLocation: RouteLocation | null;
  todayRouteSelection: TodayRouteSelection;
  onLoadWorkday: () => void;
  onNewWorkday: () => void;
  onOpenProfile: () => void;
  onOpenWorkdayHistory: () => void;
};

export function HomeIdleScreen({
  displayName,
  myLocations,
  planningStartLocation,
  todayRouteSelection,
  onLoadWorkday,
  onNewWorkday,
  onOpenProfile,
  onOpenWorkdayHistory,
}: HomeIdleScreenProps) {
  const startDisplay = resolveHomeStartLocationDisplay({
    myLocations,
    planningStartLocation,
    todayRouteSelection,
  });
  const { streetLine, localityLine } = formatHomeStartLocationLines(
    startDisplay.ready ? startDisplay.addressLine : '',
    startDisplay.name,
  );
  const displayStreetLine = startDisplay.ready ? streetLine : 'Not set';
  const navigationLabel = defaultMapsAppLabel();
  const ready = startDisplay.ready;
  const weather = useHomeWeather(startDisplay.latitude, startDisplay.longitude);

  return (
    <FadeInView style={styles.fadeRoot}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>
              {formatPersonalizedGreeting(displayName)}
            </Text>
            <Text style={styles.subGreeting}>Ready to start your workday?</Text>
          </View>
          <Pressable
            accessibilityLabel="Open profile"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onOpenProfile}
            style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
          >
            <View style={styles.avatarRing}>
              <Image
                accessibilityIgnoresInvertColors
                source={require('@/assets/images/icon.png')}
                style={styles.avatarImage}
              />
            </View>
          </Pressable>
        </View>

        <SurfaceCard padded={false} style={styles.contextCard}>
          <View style={styles.statusGrid}>
            <StatusColumn>
              <View style={[styles.statusIconCircle, { backgroundColor: AppColors.blueSoft }]}>
                <HomeIcon
                  color={AppColors.blue}
                  name="statusStart"
                  size={HomeLayout.statusIconGlyphSize}
                />
              </View>
              <Text style={styles.statusLabel}>Start Location</Text>
              <Text numberOfLines={2} style={styles.statusValue}>
                {displayStreetLine}
              </Text>
              {localityLine ? (
                <Text numberOfLines={2} style={styles.statusSubvalue}>
                  {localityLine}
                </Text>
              ) : null}
            </StatusColumn>

            <StatusColumn>
              <View
                style={[styles.statusIconCircle, { backgroundColor: HomeLayout.yellowSoft }]}
              >
                <HomeIcon
                  color={HomeLayout.yellow}
                  name="statusWeather"
                  size={HomeLayout.statusIconGlyphSize}
                />
              </View>
              <Text style={styles.statusLabel}>Weather</Text>
              {weather.status === 'ready' ? (
                <>
                  <Text style={styles.weatherValue}>{weather.temperatureF}°</Text>
                  <Text style={styles.statusSubvalue}>{weather.conditionLabel}</Text>
                </>
              ) : weather.status === 'loading' ? (
                <>
                  <Text style={styles.weatherValue}>…</Text>
                  <Text style={styles.statusSubvalue}>Loading</Text>
                </>
              ) : (
                <>
                  <Text style={styles.weatherValue}>—</Text>
                  <Text style={styles.statusSubvalue}>Unavailable</Text>
                </>
              )}
            </StatusColumn>

            <StatusColumn showDivider={false}>
              <View
                style={[styles.statusIconCircle, { backgroundColor: AppColors.purpleSoft }]}
              >
                <HomeIcon
                  color={AppColors.purple}
                  name="statusNavigation"
                  size={HomeLayout.statusIconGlyphSize}
                />
              </View>
              <Text style={styles.statusLabel}>Navigation</Text>
              <Text numberOfLines={2} style={styles.statusValue}>
                {navigationLabel}
              </Text>
            </StatusColumn>
          </View>

          <View style={styles.readyRow}>
            <HomeIcon
              color={ready ? AppColors.green : AppColors.textMuted}
              name={ready ? 'readyCheck' : 'readyIncomplete'}
              size={HomeLayout.readyIconSize}
            />
            <Text style={[styles.readyText, ready && styles.readyTextActive]}>
              {ready ? 'Ready to Go' : 'Add a start location in Profile'}
            </Text>
          </View>
        </SurfaceCard>

        <View style={styles.actions}>
          <HomeIdleAction
            accessibilityLabel="New Workday. Build and optimize today's route."
            description="Build and optimize today's route"
            icon="actionNewWorkday"
            onPress={onNewWorkday}
            title="New Workday"
            variant="newWorkday"
          />
          <HomeIdleAction
            accessibilityLabel="Load Workday. Resume or use a saved route template."
            description="Resume or use a saved route template"
            icon="actionLoadWorkday"
            onPress={onLoadWorkday}
            title="Load Workday"
            variant="loadWorkday"
          />
          <HomeIdleAction
            accessibilityLabel="Workday History. View past workdays and performance."
            description="View past workdays and performance"
            icon="actionWorkdayHistory"
            onPress={onOpenWorkdayHistory}
            title="Workday History"
            variant="workdayHistory"
          />
        </View>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  fadeRoot: {
    width: '100%',
  },
  container: {
    gap: HomeLayout.sectionGap,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    width: '100%',
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: HomeLayout.headerRowGap,
    justifyContent: 'space-between',
  },
  greetingBlock: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingRight: 4,
  },
  greeting: {
    color: AppColors.textPrimary,
    fontSize: HomeLayout.greetingFontSize,
    fontWeight: '700',
    letterSpacing: HomeLayout.greetingLetterSpacing,
    lineHeight: HomeLayout.greetingLineHeight,
  },
  subGreeting: {
    color: AppColors.textSecondary,
    fontSize: HomeLayout.subGreetingFontSize,
    lineHeight: HomeLayout.subGreetingLineHeight,
  },
  avatarButton: {
    alignItems: 'center',
    height: HomeLayout.avatarSize + 4,
    justifyContent: 'center',
    width: HomeLayout.avatarSize + 4,
  },
  avatarRing: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: HomeLayout.avatarSize / 2,
    borderWidth: HomeLayout.avatarBorderWidth,
    height: HomeLayout.avatarSize,
    justifyContent: 'center',
    overflow: 'hidden',
    width: HomeLayout.avatarSize,
  },
  avatarImage: {
    height: HomeLayout.avatarSize,
    width: HomeLayout.avatarSize,
  },
  contextCard: {
    ...AppShadows.card,
    paddingBottom: HomeLayout.statusSummaryPadding,
    paddingHorizontal: HomeLayout.statusSummaryPadding,
    paddingTop: HomeLayout.statusSummaryPadding,
  },
  statusGrid: {
    flexDirection: 'row',
  },
  statusColumn: {
    alignItems: 'center',
    flex: 1,
    gap: HomeLayout.statusColumnGap,
    paddingHorizontal: 4,
  },
  statusDivider: {
    alignSelf: 'stretch',
    backgroundColor: AppColors.border,
    marginVertical: HomeLayout.statusDividerMarginVertical,
    width: StyleSheet.hairlineWidth,
  },
  statusIconCircle: {
    alignItems: 'center',
    borderRadius: HomeLayout.statusIconCircleSize / 2,
    height: HomeLayout.statusIconCircleSize,
    justifyContent: 'center',
    width: HomeLayout.statusIconCircleSize,
  },
  statusLabel: {
    color: AppColors.textSecondary,
    fontSize: HomeLayout.statusLabelFontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusValue: {
    color: AppColors.textPrimary,
    fontSize: HomeLayout.statusValueFontSize,
    fontWeight: '700',
    lineHeight: HomeLayout.statusValueLineHeight,
    textAlign: 'center',
  },
  statusSubvalue: {
    color: AppColors.textSecondary,
    fontSize: HomeLayout.statusSubvalueFontSize,
    lineHeight: HomeLayout.statusSubvalueLineHeight,
    textAlign: 'center',
  },
  weatherValue: {
    color: AppColors.textPrimary,
    fontSize: HomeLayout.weatherValueFontSize,
    fontWeight: '700',
    lineHeight: HomeLayout.weatherValueLineHeight,
    textAlign: 'center',
  },
  readyRow: {
    alignItems: 'center',
    borderTopColor: AppColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: HomeLayout.readyRowPaddingTop,
    paddingTop: HomeLayout.readyRowPaddingTop,
  },
  readyText: {
    color: AppColors.textMuted,
    fontSize: HomeLayout.readyFontSize,
    fontWeight: '600',
  },
  readyTextActive: {
    color: AppColors.green,
  },
  actions: {
    gap: HomeLayout.actionListGap,
    width: '100%',
  },
  actionCardOuter: {
    borderRadius: HomeLayout.cardRadius,
    borderWidth: HomeLayout.actionCardBorderWidth,
    minHeight: HomeLayout.actionCardMinHeight,
    overflow: 'hidden',
    ...AppShadows.card,
  },
  actionCardInner: {
    backgroundColor: AppColors.card,
    minHeight: HomeLayout.actionCardMinHeight,
    overflow: 'hidden',
  },
  actionCardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: HomeLayout.actionCardRowGap,
    minHeight: HomeLayout.actionCardMinHeight,
    paddingHorizontal: HomeLayout.actionCardPaddingHorizontal,
    paddingVertical: HomeLayout.actionCardPaddingVertical,
  },
  pressed: {
    opacity: 0.88,
  },
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: HomeLayout.actionIconRadius,
    height: HomeLayout.actionIconSize,
    justifyContent: 'center',
    width: HomeLayout.actionIconSize,
  },
  actionCopy: {
    flex: 1,
    gap: HomeLayout.actionCopyGap,
    minWidth: 0,
  },
  actionTitle: {
    color: AppColors.textPrimary,
    fontSize: HomeLayout.actionTitleFontSize,
    fontWeight: '800',
    lineHeight: HomeLayout.actionTitleLineHeight,
  },
  actionDescription: {
    color: AppColors.textSecondary,
    fontSize: HomeLayout.actionDescriptionFontSize,
    lineHeight: HomeLayout.actionDescriptionLineHeight,
  },
});
