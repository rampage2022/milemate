import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';
import { StoresLayout } from '@/components/stores/stores-layout';

type Segment<T extends string> = {
  accessibilityLabel: string;
  id: T;
  label: string;
};

type StoresSegmentedControlProps<T extends string> = {
  onChange: (value: T) => void;
  segments: Segment<T>[];
  value: T;
};

export function StoresSegmentedControl<T extends string>({
  onChange,
  segments,
  value,
}: StoresSegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.track}>
      {segments.map((segment) => {
        const selected = segment.id === value;

        return (
          <Pressable
            key={segment.id}
            accessibilityLabel={segment.accessibilityLabel}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(segment.id);
            }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              allowFontScaling
              style={[styles.label, selected && styles.labelSelected]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: AppColors.backgroundElevated,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: StoresLayout.segmentedHeight,
    padding: 3,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: AppSpacing.minTouchTarget - 8,
    paddingHorizontal: 8,
  },
  segmentSelected: {
    backgroundColor: AppColors.card,
  },
  label: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  labelSelected: {
    color: AppColors.textPrimary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
