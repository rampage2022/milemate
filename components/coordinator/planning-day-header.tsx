import { StyleSheet, Text } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import { formatPlanningHeaderDateParts } from '@/utils/today-date';

type PlanningDayHeaderProps = {
  date?: Date;
};

export function PlanningDayHeader({ date = new Date() }: PlanningDayHeaderProps) {
  const { monthDay, weekday } = formatPlanningHeaderDateParts(date);

  return (
    <Text style={styles.date}>
      <Text style={styles.weekday}>{weekday}</Text>
      <Text style={styles.dateSeparator}> • </Text>
      <Text style={styles.monthDay}>{monthDay}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  date: {
    flexShrink: 1,
    paddingTop: 4,
  },
  weekday: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dateSeparator: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '400',
  },
  monthDay: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
});
