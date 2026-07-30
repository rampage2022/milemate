import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

type LoadingStateProps = {
  accessibilityLabel?: string;
  message?: string;
};

export function LoadingState({
  accessibilityLabel = 'Loading',
  message = 'Loading…',
}: LoadingStateProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      <ActivityIndicator color={MileMateTokens.blue} size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  message: {
    color: MileMateTokens.textSecondary,
    fontSize: 16,
  },
});
