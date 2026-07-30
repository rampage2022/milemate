import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppColors } from '@/components/shared/app-theme';

type CompletionCountdownProps = {
  value: number;
};

export function CompletionCountdown({ value }: CompletionCountdownProps) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = 0.85;
    opacity.value = 0;
    scale.value = withTiming(1, { duration: 280 });
    opacity.value = withTiming(1, { duration: 280 });
  }, [opacity, scale, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.countdown, animatedStyle]}>
      {value}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  countdown: {
    color: AppColors.green,
    fontSize: 104,
    fontWeight: '800',
    lineHeight: 112,
    marginVertical: 4,
    textAlign: 'center',
  },
});
