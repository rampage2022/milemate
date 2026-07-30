import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { LiveRouteSummaryCardData } from '@/utils/live-route-summary';

type LiveRouteNextStopCardProps = {
  nextStop: LiveRouteSummaryCardData;
};

export function LiveRouteNextStopCard({ nextStop }: LiveRouteNextStopCardProps) {
  return (
    <View accessibilityRole="summary" style={styles.card}>
      <Text numberOfLines={1} style={styles.label}>
        {nextStop.label}
      </Text>
      <Text numberOfLines={3} style={styles.primaryValue}>
        {nextStop.primaryValue}
      </Text>
      {nextStop.supportingValue.length > 0 ? (
        <View style={styles.travelRow}>
          <Ionicons color={AppColors.blue} name="car-outline" size={14} />
          <Text numberOfLines={1} style={styles.travelTime}>
            {nextStop.supportingValue}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: LiveRouteLayout.headerCardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flex: LiveRouteLayout.nextStopCardFlex,
    gap: 4,
    justifyContent: 'center',
    minHeight: LiveRouteLayout.headerTopRowMinHeight,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  label: {
    color: AppColors.blue,
    fontSize: 11,
    fontWeight: '700',
  },
  primaryValue: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 21,
    width: '100%',
  },
  travelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  travelTime: {
    color: AppColors.blue,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
