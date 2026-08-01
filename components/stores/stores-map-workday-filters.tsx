import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { StoresMapFilterChipModel, StoresMapWorkdayFilter } from '@/utils/stores-map-model';

type StoresMapWorkdayFiltersProps = {
  chips: StoresMapFilterChipModel[];
  onChange: (filterId: StoresMapWorkdayFilter) => void;
  selectedFilterId: StoresMapWorkdayFilter;
};

export function StoresMapWorkdayFilters({
  chips,
  onChange,
  selectedFilterId,
}: StoresMapWorkdayFiltersProps) {
  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {chips.map((chip) => {
        const selected = chip.filterId === selectedFilterId;

        return (
          <Pressable
            key={chip.filterId}
            accessibilityLabel={chip.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(chip.filterId);
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
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
