import {
  MileMateShadows,
  MileMateTokens,
  MileMateTypography,
} from '@/components/redesign/tokens';

/**
 * App-wide semantic colors. Values follow the approved dark redesign tokens so
 * existing `AppColors` / `HomeColors` call sites pick up the new palette.
 */
export const HomeColors = {
  background: MileMateTokens.background,
  backgroundElevated: MileMateTokens.backgroundElevated,
  card: MileMateTokens.card,
  textPrimary: MileMateTokens.textPrimary,
  textSecondary: MileMateTokens.textSecondary,
  textMuted: MileMateTokens.textMuted,
  border: MileMateTokens.cardBorder,
  blue: MileMateTokens.blue,
  blueSoft: MileMateTokens.blueSoft,
  green: MileMateTokens.green,
  greenSoft: MileMateTokens.greenSoft,
  orange: MileMateTokens.orange,
  orangeSoft: MileMateTokens.orangeSoft,
  red: MileMateTokens.red,
  redSoft: MileMateTokens.redSoft,
  purple: MileMateTokens.purple,
  purpleSoft: MileMateTokens.purpleSoft,
  gray: MileMateTokens.gray,
  /** Primary filled actions (legacy name). */
  startButton: MileMateTokens.blue,
  tabBar: MileMateTokens.tabBar,
  tabBarBorder: MileMateTokens.tabBarBorder,
  tabBarActiveIndicator: MileMateTokens.tabBarActiveIndicator,
} as const;

export const HomeSpacing = {
  screenPaddingMin: MileMateTokens.screenPaddingMin,
  screenPaddingRatio: MileMateTokens.screenPaddingRatio,
  cardRadius: MileMateTokens.radiusCard,
  buttonRadius: MileMateTokens.radiusButton,
  sectionGap: MileMateTokens.sectionGap,
  shellBottomPadding: MileMateTokens.shellBottomPadding,
  tabBarContentHeight: MileMateTokens.tabBarContentHeight,
  tabBarIconSize: MileMateTokens.tabBarIconSize,
  tabBarIndicatorWidth: MileMateTokens.tabBarIndicatorWidth,
  minTouchTarget: MileMateTokens.minTouchTarget,
} as const;

/** Typography presets (redesign). */
export const HomeTypography = MileMateTypography;

/** Elevation presets (redesign). */
export const HomeShadows = MileMateShadows;
