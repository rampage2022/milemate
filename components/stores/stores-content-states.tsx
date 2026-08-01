import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/redesign/primitives/empty-state';
import { AppColors } from '@/components/shared/app-theme';

type StoresStateAction = {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
};

type StoresLoadingStateProps = {
  message?: string;
};

export function StoresLoadingState({
  message = 'Loading stores…',
}: StoresLoadingStateProps) {
  return (
    <View accessibilityLabel={message} accessibilityRole="progressbar" style={styles.center}>
      <ActivityIndicator color={AppColors.blue} size="large" />
      <Text allowFontScaling style={styles.loadingText}>
        {message}
      </Text>
    </View>
  );
}

type StoresErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function StoresErrorState({ message, onRetry }: StoresErrorStateProps) {
  return (
    <View style={styles.center}>
      <EmptyState message={message} title="Couldn’t load stores" />
      <Pressable
        accessibilityLabel="Retry loading stores"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
      >
        <Text style={styles.actionButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

type StoresEmptyStateProps = {
  action?: StoresStateAction;
  message: string;
  secondaryAction?: StoresStateAction;
  title: string;
};

export function StoresEmptyState({
  action,
  message,
  secondaryAction,
  title,
}: StoresEmptyStateProps) {
  return (
    <View style={styles.center}>
      <EmptyState message={message} title={title} />
      {action ? (
        <Pressable
          accessibilityLabel={action.accessibilityLabel}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Text style={styles.actionButtonText}>{action.label}</Text>
        </Pressable>
      ) : null}
      {secondaryAction ? (
        <Pressable
          accessibilityLabel={secondaryAction.accessibilityLabel}
          accessibilityRole="button"
          onPress={secondaryAction.onPress}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>{secondaryAction.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'stretch',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 32,
  },
  loadingText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  actionButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 12,
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
