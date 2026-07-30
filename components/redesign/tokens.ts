/** Premium dark design tokens (approved mockups). */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const MileMateTokens = {
  background: '#0B0E14',
  backgroundElevated: '#121722',
  card: '#1C222E',
  cardBorder: 'rgba(255,255,255,0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E97A4',
  textMuted: '#6B7280',
  blue: '#007AFF',
  blueSoft: 'rgba(0,122,255,0.16)',
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.16)',
  orange: '#FF9500',
  orangeSoft: 'rgba(255,149,0,0.16)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.16)',
  purple: '#AF52DE',
  purpleSoft: 'rgba(175,82,222,0.16)',
  gray: '#636366',
  tabBar: '#0A0C10',
  tabBarBorder: 'rgba(255,255,255,0.06)',
  tabBarActiveIndicator: '#007AFF',
  minTouchTarget: 44,
  /** Bottom tab dock (`1_home_screen_v1.png`). */
  tabBarIconSize: 30,
  tabBarContentHeight: 64,
  tabBarLabelFontSize: 12,
  tabBarIndicatorWidth: 32,
  radiusCard: 16,
  radiusButton: 14,
  radiusPill: 999,
  screenPaddingMin: 20,
  screenPaddingRatio: 0.06,
  sectionGap: 16,
  shellBottomPadding: 24,
} as const;

export const MileMateTypography = {
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  } satisfies TextStyle,
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  bodyStrong: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  } satisfies TextStyle,
} as const;

export const MileMateShadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
    },
    default: {
      elevation: 6,
    },
  }),
  none: Platform.select<ViewStyle>({
    default: {},
  }),
} as const;
