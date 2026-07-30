import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';

import { useVisitAdvancement } from '@/contexts/visit-advancement-context';

type RouteEditSessionContextValue = {
  canEnterRouteEdit: boolean;
  enterRouteEdit: () => void;
  exitRouteEdit: () => void;
  isRouteEditMode: boolean;
  routeEditBlockReason: string | null;
};

const RouteEditSessionContext =
  createContext<RouteEditSessionContextValue | null>(null);

function resolveRouteEditBlockReason(input: {
  isCompletionActive: boolean;
  phase: string;
}): string | null {
  if (input.phase === 'countdown' || input.phase === 'transitioning') {
    return 'Finish or undo the stop transition before editing the route.';
  }

  if (input.phase === 'ask_sheet') {
    return 'Finish the after-completion step before editing the route.';
  }

  if (input.phase === 'all_complete') {
    return 'Complete or finish the route before editing stops.';
  }

  if (input.isCompletionActive) {
    return 'Stop completion is in progress.';
  }

  return null;
}

export function RouteEditSessionProvider({ children }: { children: ReactNode }) {
  const { isCompletionActive, phase } = useVisitAdvancement();
  const [isRouteEditMode, setIsRouteEditMode] = useState(false);

  const routeEditBlockReason = useMemo(
    () => resolveRouteEditBlockReason({ isCompletionActive, phase }),
    [isCompletionActive, phase],
  );

  const canEnterRouteEdit = routeEditBlockReason === null;

  const enterRouteEdit = useCallback(() => {
    if (!canEnterRouteEdit) {
      Alert.alert('Route editing unavailable', routeEditBlockReason ?? undefined);
      return;
    }

    setIsRouteEditMode(true);
  }, [canEnterRouteEdit, routeEditBlockReason]);

  const exitRouteEdit = useCallback(() => {
    setIsRouteEditMode(false);
  }, []);

  useEffect(() => {
    if (phase !== 'idle') {
      setIsRouteEditMode(false);
    }
  }, [phase]);

  const value = useMemo(
    (): RouteEditSessionContextValue => ({
      canEnterRouteEdit,
      enterRouteEdit,
      exitRouteEdit,
      isRouteEditMode,
      routeEditBlockReason,
    }),
    [
      canEnterRouteEdit,
      enterRouteEdit,
      exitRouteEdit,
      isRouteEditMode,
      routeEditBlockReason,
    ],
  );

  return (
    <RouteEditSessionContext.Provider value={value}>
      {children}
    </RouteEditSessionContext.Provider>
  );
}

export function useRouteEditSession(): RouteEditSessionContextValue {
  const context = useContext(RouteEditSessionContext);

  if (!context) {
    throw new Error(
      'useRouteEditSession must be used within RouteEditSessionProvider',
    );
  }

  return context;
}
