import { StyleSheet, type ViewStyle } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';

/** Shared root styles for app / tab / stack shells (presentation only). */
export const appShellStyles = StyleSheet.create({
  root: {
    backgroundColor: AppColors.background,
    flex: 1,
  } satisfies ViewStyle,
  stackContent: {
    backgroundColor: AppColors.background,
    flex: 1,
  } satisfies ViewStyle,
});
