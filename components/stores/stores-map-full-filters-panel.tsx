import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppColors } from '@/components/shared/app-theme';
import { StoresMapWorkdayFilters } from '@/components/stores/stores-map-workday-filters';
import type { StoresMapFilterChipModel } from '@/utils/stores-map-model';
import {
  applyStoresMapFilterChipPress,
  isStoresMapFilterChipSelected,
  type StoresMapFilterState,
} from '@/utils/stores-map-filter-state';

type StoresMapFullFiltersPanelProps = {
  filterState: StoresMapFilterState;
  groupChips: StoresMapFilterChipModel[];
  onClearAllFilters: () => void;
  onFilterChipPress: (filterId: string) => void;
  smartChips: StoresMapFilterChipModel[];
  workdayChips: StoresMapFilterChipModel[];
};

export function StoresMapFullFiltersPanel({
  filterState,
  groupChips,
  onClearAllFilters,
  onFilterChipPress,
  smartChips,
  workdayChips,
}: StoresMapFullFiltersPanelProps) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <StoresMapWorkdayFilters
        chips={workdayChips}
        filterState={filterState}
        onChipPress={onFilterChipPress}
        sectionTitle="Workdays"
      />
      <FilterSection chips={smartChips} filterState={filterState} onChipPress={onFilterChipPress} title="Smart Filters" />
      <FilterSection chips={groupChips} filterState={filterState} onChipPress={onFilterChipPress} title="Store Groups" />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onClearAllFilters}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>Clear All Filters</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push('/store-groups' as const);
          }}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>Manage Groups</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterSection(input: {
  chips: StoresMapFilterChipModel[];
  filterState: StoresMapFilterState;
  onChipPress: (filterId: string) => void;
  title: string;
}) {
  if (input.chips.length === 0) {
    return null;
  }

  return (
    <StoresMapWorkdayFilters
      chips={input.chips}
      filterState={input.filterState}
      onChipPress={input.onChipPress}
      sectionTitle={input.title}
    />
  );
}

export { applyStoresMapFilterChipPress, isStoresMapFilterChipSelected };

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 4,
    paddingTop: 2,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionLabel: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
