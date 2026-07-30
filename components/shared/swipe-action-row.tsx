import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { setGestureDebugOpenSwipeRow } from '@/utils/gesture-interaction-debug';

type SwipeRowPressGuardContextValue = {
  isPressBlocked: boolean;
  shouldAllowPress: () => boolean;
};

const SwipeRowPressGuardContext = createContext<SwipeRowPressGuardContextValue | null>(
  null,
);

/** While the row is swiping or settling, block the card press (RNGH `disabled` + guard). */
export function useSwipeRowPressGuard(): () => boolean {
  const context = useContext(SwipeRowPressGuardContext);

  return useCallback(() => {
    if (!context) {
      return true;
    }

    return context.shouldAllowPress();
  }, [context]);
}

export function useSwipeRowPressBlocked(): boolean {
  const context = useContext(SwipeRowPressGuardContext);

  return context?.isPressBlocked ?? false;
}

type SwipeActionRowProps = {
  actionBorderRadius?: number;
  children: ReactNode;
  enabled?: boolean;
  rightAction?: {
    accessibilityLabel: string;
    backgroundColor: string;
    label: string;
    onPress: () => void;
    textColor?: string;
  };
  rowId?: string;
  rowSpacing?: number;
};

let openSwipeableRef: Swipeable | null = null;

const PRESS_UNBLOCK_DELAY_MS = 400;

export function closeAllSwipeActions(): void {
  openSwipeableRef?.close();
  openSwipeableRef = null;
  setGestureDebugOpenSwipeRow(null);
}

/** iOS-style swipe-to-reveal action (one row open at a time). */
export function SwipeActionRow({
  actionBorderRadius = 14,
  children,
  enabled = true,
  rightAction,
  rowId,
  rowSpacing = 0,
}: SwipeActionRowProps) {
  const swipeRef = useRef<Swipeable>(null);
  const [isPressBlocked, setIsPressBlocked] = useState(false);
  const unblockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRowId = rowId ?? 'anonymous-row';

  const blockCardPress = useCallback(() => {
    if (unblockTimeoutRef.current) {
      clearTimeout(unblockTimeoutRef.current);
      unblockTimeoutRef.current = null;
    }

    setIsPressBlocked(true);
  }, []);

  const scheduleUnblockCardPress = useCallback(() => {
    if (unblockTimeoutRef.current) {
      clearTimeout(unblockTimeoutRef.current);
    }

    unblockTimeoutRef.current = setTimeout(() => {
      setIsPressBlocked(false);
      unblockTimeoutRef.current = null;
    }, PRESS_UNBLOCK_DELAY_MS);
  }, []);

  const shouldAllowPress = useCallback(() => !isPressBlocked, [isPressBlocked]);

  if (!enabled || !rightAction) {
    return <View style={{ marginBottom: rowSpacing }}>{children}</View>;
  }

  return (
    <SwipeRowPressGuardContext.Provider value={{ isPressBlocked, shouldAllowPress }}>
      <View style={{ marginBottom: rowSpacing }}>
        <Swipeable
          ref={swipeRef}
          activeOffsetX={[-18, 18]}
          failOffsetY={[-10, 10]}
          friction={2}
          overshootRight={false}
          onSwipeableOpenStartDrag={() => {
            blockCardPress();
          }}
          onSwipeableCloseStartDrag={() => {
            blockCardPress();
          }}
          onSwipeableOpen={() => {
            blockCardPress();
          }}
          onSwipeableWillOpen={() => {
            blockCardPress();

            if (openSwipeableRef && openSwipeableRef !== swipeRef.current) {
              openSwipeableRef.close();
            }

            openSwipeableRef = swipeRef.current;
            setGestureDebugOpenSwipeRow(resolvedRowId);
          }}
          onSwipeableClose={() => {
            scheduleUnblockCardPress();

            if (openSwipeableRef === swipeRef.current) {
              openSwipeableRef = null;
              setGestureDebugOpenSwipeRow(null);
            }
          }}
          renderRightActions={() => (
            <Pressable
              accessibilityLabel={rightAction.accessibilityLabel}
              accessibilityRole="button"
              onPress={() => {
                blockCardPress();
                swipeRef.current?.close();
                rightAction.onPress();
              }}
              style={[
                styles.action,
                {
                  backgroundColor: rightAction.backgroundColor,
                  borderRadius: actionBorderRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionLabel,
                  { color: rightAction.textColor ?? '#FFFFFF' },
                ]}
              >
                {rightAction.label}
              </Text>
            </Pressable>
          )}
        >
          {children}
        </Swipeable>
      </View>
    </SwipeRowPressGuardContext.Provider>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 88,
    paddingHorizontal: 16,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
