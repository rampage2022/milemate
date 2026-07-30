import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import { VisitStatusBadge } from '@/components/shared/visit-status-badge';
import type { TodayRouteStore } from '@/hooks/use-today-route';
import { formatStoreAddress } from '@/types/store';

type NextStopCardProps = {
  stop: TodayRouteStore;
  onPress?: () => void;
};

export function NextStopCard({ onPress, stop }: NextStopCardProps) {
  const { store, visit } = stop;

  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.card}>
      <Text style={styles.eyebrow}>Next Stop</Text>
      <Text style={styles.storeName}>{store.name}</Text>
      <Text style={styles.address}>{formatStoreAddress(store)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.orderLabel}>Stop {visit.routeOrder}</Text>
        <VisitStatusBadge status={visit.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 1,
    gap: 6,
    padding: 18,
  },
  eyebrow: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  storeName: {
    color: AppColors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  orderLabel: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
