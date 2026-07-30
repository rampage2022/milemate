import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';

type ScreenScaffoldProps = {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'style'>;
};

export function ScreenScaffold({
  children,
  footer,
  scroll = true,
  scrollProps,
}: ScreenScaffoldProps) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: AppColors.background,
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: AppSpacing.screenPaddingMin,
  },
  scrollContent: {
    flexGrow: 1,
    gap: AppSpacing.sectionGap,
    paddingBottom: 24,
    paddingHorizontal: AppSpacing.screenPaddingMin,
    paddingTop: 8,
  },
  footer: {
    borderTopColor: AppColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: AppSpacing.screenPaddingMin,
    paddingTop: 12,
  },
});
