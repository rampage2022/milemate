import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';

/** Inline calendar needs room so day numbers are not clipped on iOS. */
export const MILEMATE_INLINE_CALENDAR_MIN_HEIGHT = Platform.select({
  ios: 352,
  default: undefined,
});

type MileMateDatePickerDisplay = 'inline' | 'calendar' | 'default' | 'spinner' | 'compact';

export type MileMateDatePickerProps = {
  display?: MileMateDatePickerDisplay;
  maximumDate?: Date;
  minimumDate?: Date;
  mode?: 'date';
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  style?: StyleProp<ViewStyle>;
  value: Date;
};

/**
 * Date picker styled for MileMate surfaces (light cards).
 * Forces light calendar chrome so day/month numbers stay readable.
 */
export function MileMateDatePicker({
  display,
  maximumDate,
  minimumDate,
  mode = 'date',
  onChange,
  style,
  value,
}: MileMateDatePickerProps) {
  const resolvedDisplay =
    display ?? (Platform.OS === 'ios' ? 'inline' : 'default');
  const isInline = Platform.OS === 'ios' && resolvedDisplay === 'inline';

  const wrapperStyle = [
    styles.wrapper,
    isInline ? styles.wrapperInline : null,
  ];

  if (Platform.OS === 'ios') {
    const iosDisplay =
      resolvedDisplay === 'calendar' ? 'inline' : resolvedDisplay;

    return (
      <View style={wrapperStyle}>
        <DateTimePicker
          accentColor={AppColors.blue}
          display={iosDisplay}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          mode={mode}
          onChange={onChange}
          style={[styles.picker, style]}
          textColor={AppColors.textPrimary}
          themeVariant="light"
          value={value}
        />
      </View>
    );
  }

  const androidDisplay =
    resolvedDisplay === 'inline' || resolvedDisplay === 'compact'
      ? 'calendar'
      : resolvedDisplay === 'spinner'
        ? 'spinner'
        : resolvedDisplay === 'calendar'
          ? 'calendar'
          : 'default';

  return (
    <View style={wrapperStyle}>
      <DateTimePicker
        display={androidDisplay}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        mode={mode}
        onChange={onChange}
        style={[styles.picker, style]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    backgroundColor: AppColors.card,
    width: '100%',
  },
  wrapperInline: {
    minHeight: MILEMATE_INLINE_CALENDAR_MIN_HEIGHT,
  },
  picker: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
