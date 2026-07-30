import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { MileMateDatePicker } from '@/components/shared/milemate-date-picker';
import { AppColors } from '@/components/shared/app-theme';
import { dateKeyFromDate } from '@/utils/visit-history';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type VisitHistoryCalendarSheetProps = {
  initialDate: Date;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
  visible: boolean;
};

export function VisitHistoryCalendarSheet({
  initialDate,
  onClose,
  onSelectDate,
  visible,
}: VisitHistoryCalendarSheetProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Dismiss calendar" onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <Text style={styles.title}>Choose date</Text>
          <MileMateDatePicker
            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
            maximumDate={new Date()}
            mode="date"
            onChange={(_event: DateTimePickerEvent, date?: Date) => {
              if (!date) {
                return;
              }

              onSelectDate(dateKeyFromDate(date));
              onClose();
            }}
            value={initialDate}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.doneButton, pressed && styles.donePressed]}
          >
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AppColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 8,
    maxHeight: '90%',
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 8,
  },
  donePressed: {
    opacity: 0.9,
  },
  doneLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
