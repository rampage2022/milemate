import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { VisitHistoryFilter } from '@/utils/visit-history';

const FILTERS: { id: VisitHistoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'issues', label: 'Issues' },
];

type VisitHistoryFilterBarProps = {
  filter: VisitHistoryFilter;
  onChange: (filter: VisitHistoryFilter) => void;
};

export function VisitHistoryFilterBar({ filter, onChange }: VisitHistoryFilterBarProps) {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {FILTERS.map((entry) => {
        const selected = entry.id === filter;

        return (
          <Pressable
            key={entry.id}
            accessibilityLabel={`${entry.label} filter`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(entry.id);
            }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
              {entry.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type VisitHistoryCalendarButtonProps = {
  onPress: () => void;
  selectedDateLabel: string | null;
};

export function VisitHistoryCalendarButton({
  onPress,
  selectedDateLabel,
}: VisitHistoryCalendarButtonProps) {
  return (
    <Pressable
      accessibilityLabel={
        selectedDateLabel
          ? `Calendar, showing ${selectedDateLabel}. Tap to change date.`
          : 'Open calendar to choose a date'
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.calendarButton, pressed && styles.calendarPressed]}
    >
      <Ionicons color={AppColors.blue} name="calendar-outline" size={22} />
      {selectedDateLabel ? (
        <Text numberOfLines={1} style={styles.selectedDate}>
          {selectedDateLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderColor: AppColors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: AppColors.blue,
  },
  chipLabel: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: AppColors.blue,
    fontWeight: '700',
  },
  calendarButton: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calendarPressed: {
    opacity: 0.88,
  },
  selectedDate: {
    color: AppColors.blue,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 140,
  },
});
