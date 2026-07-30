import { StyleSheet } from 'react-native';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { LiveRouteLayout } from '@/components/coordinator/live-route-layout';
import { AppColors } from '@/components/shared/app-theme';

export const stopCardElevation = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

export const stopCardSharedStyles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: LiveRouteLayout.stopGap,
    overflow: 'hidden',
    ...stopCardElevation,
  },
  cardFlushBottom: {
    marginBottom: 0,
  },
  leftAccent: {
    borderLeftWidth: 4,
  },
  sectionLabel: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
});
