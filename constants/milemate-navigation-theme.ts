import {
  DarkTheme,
  type Theme,
} from '@react-navigation/native';

import { AppColors } from '@/components/shared/app-theme';

/**
 * React Navigation theme aligned with MileMate redesign tokens.
 * Used for stack/modal chrome; tab tint colors remain on `Tabs` screenOptions.
 */
export const MileMateNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: AppColors.blue,
    background: AppColors.background,
    card: AppColors.card,
    text: AppColors.textPrimary,
    border: AppColors.border,
    notification: AppColors.red,
  },
};
