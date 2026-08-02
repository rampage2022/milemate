import { StyleSheet, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import { StoresMapFullFiltersPanel } from '@/components/stores/stores-map-full-filters-panel';
import { StoresSearchField } from '@/components/stores/stores-search-field';
import { StoresSegmentedControl } from '@/components/stores/stores-segmented-control';
import type { StoresScope } from '@/components/stores/stores-screen';
import type { StoresMapFilterChipModel } from '@/utils/stores-map-model';
import type { StoresMapFilterState } from '@/utils/stores-map-filter-state';
import { STORES_MAP_SHEET_STICKY_CONTROLS_GAP } from '@/utils/stores-map-sheet-layout';

type StoresMapSheetControlsProps = {
  filterState: StoresMapFilterState;
  groupChips: StoresMapFilterChipModel[];
  onChipPress: (filterId: string) => void;
  onClearAllFilters: () => void;
  onClearSearch: () => void;
  onScopeChange: (scope: StoresScope) => void;
  scope: StoresScope;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showScopeControls: boolean;
  showSearch: boolean;
  smartChips: StoresMapFilterChipModel[];
  workdayChips: StoresMapFilterChipModel[];
};

export function StoresMapSheetControls({
  filterState,
  groupChips,
  onChipPress,
  onClearAllFilters,
  onClearSearch,
  onScopeChange,
  scope,
  searchQuery,
  setSearchQuery,
  showScopeControls,
  showSearch,
  smartChips,
  workdayChips,
}: StoresMapSheetControlsProps) {
  return (
    <View style={styles.wrap}>
      {showScopeControls ? (
        <StoresSegmentedControl
          onChange={onScopeChange}
          segments={[
            {
              accessibilityLabel: 'Stores on today’s route',
              id: 'today',
              label: 'Today',
            },
            {
              accessibilityLabel: 'All saved stores',
              id: 'all',
              label: 'All Stores',
            },
          ]}
          value={scope}
        />
      ) : null}
      {showScopeControls && showSearch ? (
        <StoresSearchField
          onChangeText={setSearchQuery}
          onClear={onClearSearch}
          value={searchQuery}
        />
      ) : null}
      <StoresMapFullFiltersPanel
        filterState={filterState}
        groupChips={groupChips}
        onClearAllFilters={onClearAllFilters}
        onFilterChipPress={onChipPress}
        smartChips={smartChips}
        workdayChips={workdayChips}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AppColors.card,
    flexGrow: 0,
    flexShrink: 0,
    gap: STORES_MAP_SHEET_STICKY_CONTROLS_GAP,
    paddingBottom: 4,
  },
});
