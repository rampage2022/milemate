import { StyleSheet, Text, View } from 'react-native';

import { StoresLayout } from '@/components/stores/stores-layout';
import { AppColors } from '@/components/shared/app-theme';

type StoresHeaderProps = {
  subtitle?: string;
};

export function StoresHeader({ subtitle }: StoresHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text accessibilityRole="header" allowFontScaling style={styles.title}>
        Stores
      </Text>
      {subtitle ? (
        <Text allowFontScaling style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    marginBottom: StoresLayout.headerBottomGap,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: StoresLayout.titleSize,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: StoresLayout.subtitleSize,
    lineHeight: 20,
  },
});
