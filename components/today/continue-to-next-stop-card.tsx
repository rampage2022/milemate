import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, AppSpacing } from '@/components/shared/app-theme';

type ContinueToNextStopCardProps = {
  nextStoreName: string;
  onPress: () => void;
};

export function ContinueToNextStopCard({
  nextStoreName,
  onPress,
}: ContinueToNextStopCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.title}>Continue to next stop</Text>
      <Text style={styles.subtitle}>{nextStoreName}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.blue,
    borderRadius: AppSpacing.cardRadius,
    borderWidth: 2,
    gap: 4,
    padding: 18,
  },
  title: {
    color: AppColors.blue,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 15,
  },
});
