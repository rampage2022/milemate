import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppColors } from '@/components/shared/app-theme';
import type { AfterCompletionMode } from '@/types/after-completion';
import { getCountdownSubtitle } from '@/types/after-completion';

import { CompletionCountdown } from './completion-countdown';

type VisitCompletionOverlayProps = {
  visible: boolean;
  variant: 'countdown' | 'workday_complete';
  countdownValue: number;
  nextStoreName: string | null;
  afterCompletionMode: AfterCompletionMode;
  onUndo: () => void;
};

const BLUR_INTENSITY = Platform.OS === 'ios' ? 52 : 72;

export function VisitCompletionOverlay({
  afterCompletionMode,
  countdownValue,
  nextStoreName,
  onUndo,
  variant,
  visible,
}: VisitCompletionOverlayProps) {
  const scrimOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scrimOpacity.value = withTiming(1, { duration: 200 });
      return;
    }

    scrimOpacity.value = withTiming(0, { duration: 200 });
  }, [scrimOpacity, visible]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  if (!visible) {
    return null;
  }

  const statusText =
    variant === 'workday_complete'
      ? 'All stops complete'
      : getCountdownSubtitle(afterCompletionMode);

  return (
    <Modal animationType="none" transparent visible={visible}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, scrimStyle]}>
          <BlurView
            experimentalBlurMethod={
              Platform.OS === 'android' ? 'dimezisBlurView' : undefined
            }
            intensity={BLUR_INTENSITY}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View style={styles.scrimTint} />
        </Animated.View>

        <View pointerEvents="box-none" style={styles.contentGroup}>
          <View style={styles.checkmarkCircle}>
            <Ionicons color="#FFFFFF" name="checkmark" size={28} />
          </View>

          <Text style={styles.title}>
            {variant === 'workday_complete' ? 'Workday Complete' : 'Visit Complete'}
          </Text>

          {variant === 'countdown' && countdownValue > 0 ? (
            <CompletionCountdown value={countdownValue} />
          ) : null}

          {variant === 'countdown' && nextStoreName ? (
            <>
              <Text style={styles.nextLabel}>Next Stop</Text>
              <Text style={styles.nextName}>{nextStoreName}</Text>
            </>
          ) : null}

          <Text style={styles.statusText}>{statusText}</Text>

          {variant === 'countdown' ? (
            <Pressable
              onPress={onUndo}
              style={({ pressed }) => [
                styles.undoButton,
                pressed && styles.undoButtonPressed,
              ]}
            >
              <Ionicons color="#FFFFFF" name="arrow-undo" size={18} />
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scrimTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.48)',
  },
  contentGroup: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  checkmarkCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: 4,
    width: 56,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  nextLabel: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  nextName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 16,
    marginTop: 2,
    textAlign: 'center',
  },
  undoButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 12,
    minWidth: 148,
    paddingHorizontal: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  undoButtonPressed: {
    opacity: 0.88,
  },
  undoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
