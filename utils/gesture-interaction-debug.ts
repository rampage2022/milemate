type GestureDebugState = {
  activeDragItemId: string | null;
  blockingOverlayMounted: boolean;
  openSwipeRowId: string | null;
  screenName: string | null;
};

export type { GestureDebugState };

type Listener = (state: GestureDebugState) => void;

const state: GestureDebugState = {
  activeDragItemId: null,
  blockingOverlayMounted: false,
  openSwipeRowId: null,
  screenName: null,
};

const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener({ ...state });
  }
}

export function subscribeGestureDebug(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...state });

  return () => {
    listeners.delete(listener);
  };
}

export function getGestureDebugState(): GestureDebugState {
  return { ...state };
}

function logDev(event: string, detail?: Record<string, unknown>): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (detail) {
      console.log(`[gesture-debug] ${event}`, detail);
    } else {
      console.log(`[gesture-debug] ${event}`);
    }
  }
}

export function setGestureDebugScreen(screenName: string | null): void {
  state.screenName = screenName;
  logDev('screen', { screenName });
  emit();
}

export function setGestureDebugDragItem(itemId: string | null): void {
  state.activeDragItemId = itemId;
  logDev(itemId ? 'drag start' : 'drag end/cancel', { itemId });
  emit();
}

export function setGestureDebugOpenSwipeRow(rowId: string | null): void {
  state.openSwipeRowId = rowId;
  logDev(rowId ? 'swipe open' : 'swipe close', { rowId });
  emit();
}

export function setGestureDebugBlockingOverlay(mounted: boolean): void {
  state.blockingOverlayMounted = mounted;
  logDev(mounted ? 'overlay mount' : 'overlay unmount');
  emit();
}

export function resetGestureDebugInteractionState(): void {
  state.activeDragItemId = null;
  state.openSwipeRowId = null;
  state.blockingOverlayMounted = false;
  logDev('gesture state reset');
  emit();
}
