import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { RouteMapStopRow } from '@/utils/route-map-utils';

type BriefingRouteStopListProps = {
  onSelectStop: (storeId: string) => void;
  rows: RouteMapStopRow[];
  selectedStoreId: string | null;
};

export function BriefingRouteStopList({
  onSelectStop,
  rows,
  selectedStoreId,
}: BriefingRouteStopListProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Stops</Text>
      <ScrollView
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.list}
      >
        {rows.map((row) => {
          const isSelected = row.storeId === selectedStoreId;

          return (
            <Pressable
              key={row.storeId}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                onSelectStop(row.storeId);
              }}
              style={({ pressed }) => [
                styles.row,
                isSelected && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={[styles.orderBadge, isSelected && styles.orderBadgeSelected]}>
                <Text style={[styles.orderText, isSelected && styles.orderTextSelected]}>
                  {row.routeOrder}
                </Text>
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {row.title}
                </Text>
                {row.subtitle.length > 0 ? (
                  <Text numberOfLines={2} style={styles.rowSubtitle}>
                    {row.subtitle}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                color={isSelected ? AppColors.blue : AppColors.textMuted}
                name="chevron-forward"
                size={16}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  list: {
    maxHeight: 220,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  row: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowSelected: {
    borderColor: AppColors.blue,
  },
  rowPressed: {
    opacity: 0.9,
  },
  orderBadge: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  orderBadgeSelected: {
    backgroundColor: AppColors.blue,
  },
  orderText: {
    color: AppColors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  orderTextSelected: {
    color: '#FFFFFF',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTitle: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
