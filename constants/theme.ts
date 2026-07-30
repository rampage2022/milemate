/**
 * Navigation / Expo template colors. MileMate screen chrome uses `AppColors`
 * from `@/components/shared/app-theme` (redesign tokens).
 */

import { Platform } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

const tintColorLight = MileMateTokens.blue;
const tintColorDark = MileMateTokens.blue;

export const Colors = {
  light: {
    text: MileMateTokens.textPrimary,
    background: MileMateTokens.background,
    tint: tintColorLight,
    icon: MileMateTokens.textSecondary,
    tabIconDefault: MileMateTokens.textSecondary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: MileMateTokens.textPrimary,
    background: MileMateTokens.background,
    tint: tintColorDark,
    icon: MileMateTokens.textSecondary,
    tabIconDefault: MileMateTokens.textSecondary,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
