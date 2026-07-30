import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import { VisitStatusBadge } from '@/components/shared/visit-status-badge';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';

type RouteStopListProps = {
  visits: StoreVisit[];
  storesById: Record<string, Store>;
  currentVisitId: string | null;
};

function isActiveRouteStop(visit: StoreVisit, currentVisitId: string | null): boolean {
  if (currentVisitId && visit.id === currentVisitId) {
    return true;
  }

  return visit.status === 'current' || visit.status === 'checked_in';
}

export function RouteStopList({
  currentVisitId,
  storesById,
  visits,
}: RouteStopListProps) {
  const orderedVisits = [...visits].sort((a, b) => a.routeOrder - b.routeOrder);

  return (
    <View style={styles.list}>
      {orderedVisits.map((visit) => {
        const store = storesById[visit.storeId];
        const storeName = store?.name ?? 'Unknown store';
        const isActive = isActiveRouteStop(visit, currentVisitId);

        return (
          <View
            key={visit.id}
            style={[
              styles.row,
              isActive && styles.rowActive,
              visit.status === 'skipped' && styles.rowSkipped,
            ]}
          >
            <Text style={[styles.rowOrder, isActive && styles.rowOrderActive]}>
              {visit.routeOrder}
            </Text>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowName, isActive && styles.rowNameActive]}>
                {storeName}
              </Text>
            </View>
            <VisitStatusBadge status={visit.status} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    marginTop: 4,
  },
  row: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  rowActive: {
    backgroundColor: '#EFF6FF',
    borderColor: AppColors.blue,
  },
  rowSkipped: {
    borderColor: '#FDBA74',
  },
  rowOrder: {
    color: AppColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    width: 18,
  },
  rowOrderActive: {
    color: AppColors.blue,
  },
  rowCopy: {
    flex: 1,
  },
  rowName: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowNameActive: {
    color: AppColors.blue,
    fontWeight: '700',
  },
});
