import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import {
  STORES_MAP_FILTER_CHIP_MAX_HEIGHT,
  STORES_MAP_FILTER_CHIP_MIN_HEIGHT,
  STORES_MAP_FILTER_ROW_HEIGHT,
} from '@/utils/stores-map-sheet-layout';
import type { StoresMapFilterChipModel } from '@/utils/stores-map-model';
import {
  isStoresMapFilterChipSelected,
  type StoresMapFilterState,
} from '@/utils/stores-map-filter-state';

type StoresMapWorkdayFiltersProps = {
  chips: StoresMapFilterChipModel[];
  filterState: StoresMapFilterState;
  onChipPress: (filterId: string) => void;
  sectionTitle?: string;
};

export function StoresMapWorkdayFilters({
  chips,
  filterState,
  onChipPress,
  sectionTitle,
}: StoresMapWorkdayFiltersProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {sectionTitle ? (
        <Text allowFontScaling style={styles.sectionTitle}>
          {sectionTitle}
        </Text>
      ) : null}
      <View style={styles.row}>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={styles.scroll}
      >
        {chips.map((chip) => {
          const selected = isStoresMapFilterChipSelected({
            chipFilterId: chip.filterId,
            state: filterState,
          });

          return (
            <Pressable
              key={chip.filterId}
              accessibilityLabel={chip.accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onChipPress(chip.filterId);
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected
                    ? chip.colorStyle.chipBackground
                    : AppColors.backgroundElevated,
                  borderColor: selected ? chip.colorStyle.chipBorder : AppColors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: chip.colorStyle.markerBackground },
                ]}
              />
              <Text
                allowFontScaling
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: selected ? chip.colorStyle.chipText : AppColors.textPrimary },
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 4,
  },
  sectionTitle: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    height: STORES_MAP_FILTER_ROW_HEIGHT,
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
    height: STORES_MAP_FILTER_ROW_HEIGHT,
    maxHeight: STORES_MAP_FILTER_ROW_HEIGHT,
  },
  content: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    height: STORES_MAP_FILTER_CHIP_MIN_HEIGHT,
    justifyContent: 'center',
    maxHeight: STORES_MAP_FILTER_CHIP_MAX_HEIGHT,
    paddingHorizontal: 12,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  label: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
