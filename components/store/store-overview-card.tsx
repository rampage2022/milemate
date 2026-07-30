import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StoreOverviewLayout } from '@/components/store/store-overview-layout';
import { AppColors } from '@/components/shared/app-theme';

type StoreOverviewCardProps = PropsWithChildren<{
  title: string;
}>;

export function StoreOverviewCard({ children, title }: StoreOverviewCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: StoreOverviewLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: StoreOverviewLayout.sectionGap,
    paddingHorizontal: StoreOverviewLayout.cardPaddingH,
    paddingVertical: StoreOverviewLayout.cardPaddingV,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});
