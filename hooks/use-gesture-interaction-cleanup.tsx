import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { closeAllSwipeActions } from '@/components/shared/swipe-action-row';
import {
  getGestureDebugState,
  resetGestureDebugInteractionState,
  setGestureDebugScreen,
  subscribeGestureDebug,
} from '@/utils/gesture-interaction-debug';
import type { GestureDebugState } from '@/utils/gesture-interaction-debug';

/** Enable only when actively debugging gesture conflicts. */
export const ENABLE_GESTURE_DEBUG_UI = false;

/** Close swipe rows and reset drag debug state when leaving a screen or backgrounding. */
export function useGestureInteractionCleanup(screenName: string): void {
  useFocusEffect(
    useCallback(() => {
      setGestureDebugScreen(screenName);

      return () => {
        closeAllSwipeActions();
        resetGestureDebugInteractionState();
        setGestureDebugScreen(null);
      };
    }, [screenName]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        closeAllSwipeActions();
        resetGestureDebugInteractionState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

export function GestureDebugOverlay() {
  const [debugState, setDebugState] = useState<GestureDebugState>(() =>
    getGestureDebugState(),
  );

  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
      return;
    }

    return subscribeGestureDebug(setDebugState);
  }, []);

  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.banner}>
      <Text style={styles.text}>screen: {debugState.screenName ?? '—'}</Text>
      <Text style={styles.text}>drag: {debugState.activeDragItemId ?? '—'}</Text>
      <Text style={styles.text}>swipe: {debugState.openSwipeRowId ?? '—'}</Text>
      <Text style={styles.text}>
        overlay: {debugState.blockingOverlayMounted ? 'yes' : 'no'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 8,
    bottom: 96,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: 'absolute',
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
});
