import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import {
  isStoresMapFilterChipSelected,
  toggleStoresMapSmartFilter,
  type StoresMapFilterState,
} from '@/utils/stores-map-filter-state';
import {
  smartFilterQuickLabel,
  type StoresMapSmartFilterId,
} from '@/utils/stores-map-smart-filter-index';
import {
  STORES_MAP_QUICK_FILTER_CHIP_HEIGHT,
  STORES_MAP_QUICK_FILTER_ROW_TRAILING_RESERVE,
} from '@/utils/stores-map-sheet-layout';

const QUICK_SMART_FILTERS: StoresMapSmartFilterId[] = [
  'delivery_soon',
  'missed_delivery',
  'no_visit_7d',
];

const QUICK_CHIP_BACKPLATE = 'rgba(255, 255, 255, 0.06)';
const QUICK_CHIP_BORDER = 'rgba(255, 255, 255, 0.14)';
const QUICK_CHIP_SELECTED_BORDER = 'rgba(255, 255, 255, 0.32)';
const QUICK_CHIP_SELECTED_BACKPLATE = 'rgba(255, 255, 255, 0.1)';

type StoresMapQuickFilterRowProps = {
  filterState: StoresMapFilterState;
  onMorePress: () => void;
  onToggleSmartFilter: (filterId: StoresMapSmartFilterId) => void;
};

export function StoresMapQuickFilterRow({
  filterState,
  onMorePress,
  onToggleSmartFilter,
}: StoresMapQuickFilterRowProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      {QUICK_SMART_FILTERS.map((filterId) => {
        const chipId = `smart:${filterId}`;
        const selected = isStoresMapFilterChipSelected({
          chipFilterId: chipId,
          state: filterState,
        });

        return (
          <Pressable
            key={filterId}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              onToggleSmartFilter(filterId);
            }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text allowFontScaling numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
              {smartFilterQuickLabel(filterId)}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityLabel="Show more filters"
        accessibilityRole="button"
        onPress={onMorePress}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      >
        <Text allowFontScaling style={styles.label}>
          More
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export function applyQuickSmartFilterToggle(
  state: StoresMapFilterState,
  filterId: StoresMapSmartFilterId,
): StoresMapFilterState {
  return toggleStoresMapSmartFilter(state, filterId);
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: STORES_MAP_QUICK_FILTER_CHIP_HEIGHT,
  },
  content: {
    alignItems: 'center',
    gap: 8,
    height: STORES_MAP_QUICK_FILTER_CHIP_HEIGHT,
    paddingRight: STORES_MAP_QUICK_FILTER_ROW_TRAILING_RESERVE,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: QUICK_CHIP_BACKPLATE,
    borderColor: QUICK_CHIP_BORDER,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: STORES_MAP_QUICK_FILTER_CHIP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: QUICK_CHIP_SELECTED_BACKPLATE,
    borderColor: QUICK_CHIP_SELECTED_BORDER,
  },
  label: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  labelSelected: {
    color: AppColors.textPrimary,
  },
  pressed: {
    opacity: 0.88,
  },
});
