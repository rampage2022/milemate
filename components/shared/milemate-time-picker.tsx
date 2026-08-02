import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';

type MileMateTimePickerDisplay = 'default' | 'spinner' | 'compact';

export type MileMateTimePickerProps = {
  display?: MileMateTimePickerDisplay;
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  style?: StyleProp<ViewStyle>;
  value: Date;
};

/**
 * Time picker styled for MileMate surfaces (locale-aware 12h/24h).
 */
export function MileMateTimePicker({
  display,
  onChange,
  style,
  value,
}: MileMateTimePickerProps) {
  const resolvedDisplay =
    display ?? (Platform.OS === 'ios' ? 'spinner' : 'default');

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.wrapper}>
        <DateTimePicker
          accentColor={AppColors.blue}
          display={resolvedDisplay === 'compact' ? 'compact' : 'spinner'}
          mode="time"
          onChange={onChange}
          style={[styles.picker, style]}
          textColor={AppColors.textPrimary}
          themeVariant="light"
          value={value}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <DateTimePicker
        display={resolvedDisplay === 'spinner' ? 'spinner' : 'default'}
        mode="time"
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
  picker: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
