import { StyleSheet, Text, View } from 'react-native';

import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { LiveRouteSummaryCardData } from '@/utils/live-route-summary';

type LiveRouteFinishCardProps = {
  finish: LiveRouteSummaryCardData;
};

export function LiveRouteFinishCard({ finish }: LiveRouteFinishCardProps) {
  return (
    <View accessibilityRole="summary" style={styles.card}>
      <Text numberOfLines={1} style={styles.label}>
        {finish.label}
      </Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={styles.primaryValue}>
        {finish.primaryValue}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: LiveRouteLayout.headerCardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: LiveRouteLayout.headerFinishRowMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    width: '100%',
  },
  label: {
    color: AppColors.textMuted,
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 0,
  },
  primaryValue: {
    color: AppColors.textPrimary,
    flexShrink: 0,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 20,
    marginLeft: 12,
    textAlign: 'right',
  },
});
