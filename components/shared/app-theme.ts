import {
  HomeColors,
  HomeShadows,
  HomeSpacing,
  HomeTypography,
} from '@/components/home/theme';
import { MileMateTokens } from '@/components/redesign/tokens';

export const AppColors = HomeColors;

export const AppSpacing = {
  screenPaddingMin: HomeSpacing.screenPaddingMin,
  screenPaddingRatio: HomeSpacing.screenPaddingRatio,
  cardRadius: HomeSpacing.cardRadius,
  buttonRadius: HomeSpacing.buttonRadius,
  sectionGap: HomeSpacing.sectionGap,
  shellBottomPadding: HomeSpacing.shellBottomPadding,
  tabBarContentHeight: HomeSpacing.tabBarContentHeight,
  tabBarIconSize: HomeSpacing.tabBarIconSize,
  tabBarIndicatorWidth: HomeSpacing.tabBarIndicatorWidth,
  minTouchTarget: HomeSpacing.minTouchTarget,
} as const;

export const AppTypography = HomeTypography;
export const AppShadows = HomeShadows;

/** Global shell configuration for later screen phases. */
export const AppShell = {
  statusBarStyle: 'light' as const,
  horizontalGutterMin: AppSpacing.screenPaddingMin,
  horizontalGutterRatio: AppSpacing.screenPaddingRatio,
} as const;

export function resolveHorizontalScreenPadding(windowWidth: number): number {
  return Math.max(
    AppSpacing.screenPaddingMin,
    Math.round(windowWidth * AppSpacing.screenPaddingRatio),
  );
}

/** Raw redesign tokens when a component needs values not on AppColors. */
export { MileMateTokens };

export const VisitStatusLabels = {
  pending: 'Pending',
  current: 'Current',
  checked_in: 'Checked in',
  completed: 'Completed',
  skipped: 'Skipped',
} as const;
