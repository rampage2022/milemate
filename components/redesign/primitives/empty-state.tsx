import { StyleSheet, Text, View } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

type EmptyStateProps = {
  message: string;
  title: string;
};

export function EmptyState({ message, title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 24,
  },
  title: {
    color: MileMateTokens.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    color: MileMateTokens.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
