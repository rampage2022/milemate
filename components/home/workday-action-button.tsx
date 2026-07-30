import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HomeColors } from '@/components/home/theme';

type WorkdayActionButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant: 'start' | 'end' | 'complete';
};

export function WorkdayActionButton({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  variant,
}: WorkdayActionButtonProps) {
  const isEnd = variant === 'end';
  const isComplete = variant === 'complete';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: disabled && !isEnd }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        isEnd ? styles.endButton : isComplete ? styles.completeButton : styles.startButton,
        disabled ? styles.disabled : null,
      ]}
    >
      {isEnd ? (
        <Ionicons
          color="#FFFFFF"
          name="stop"
          size={18}
          style={styles.leadingIcon}
        />
      ) : null}
      {isComplete ? (
        <View style={styles.completeIconCircle}>
          <Ionicons color={HomeColors.blue} name="checkmark" size={14} />
        </View>
      ) : null}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  startButton: {
    backgroundColor: HomeColors.startButton,
  },
  endButton: {
    backgroundColor: HomeColors.red,
  },
  completeButton: {
    backgroundColor: HomeColors.blue,
  },
  completeIconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    marginRight: 10,
    width: 22,
  },
  disabled: {
    opacity: 0.5,
  },
  leadingIcon: {
    marginRight: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
