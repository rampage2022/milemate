import { StyleSheet, Text, View } from 'react-native';

import { HomeColors } from '@/components/home/theme';

type HomeHeaderProps = {
  onLongPressTitle?: () => void;
  subtitle?: string;
  title?: string;
};

export function HomeHeader({
  onLongPressTitle,
  title = 'MileMate',
  subtitle = 'Track your workday',
}: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <Text onLongPress={onLongPressTitle} style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: HomeColors.textPrimary,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: HomeColors.textSecondary,
    fontSize: 17,
    marginTop: 6,
  },
});
