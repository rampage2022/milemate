import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'expo-router';

import type {
  LiveRouteViewMode,
  WorkdayDockDestination,
} from '@/constants/workday-navigation-layout';
import type { CompletionPhase } from '@/contexts/visit-advancement-context';
import { useVisitAdvancement } from '@/contexts/visit-advancement-context';
import { useWorkdayTrackerContext } from '@/contexts/workday-tracker-context';
import {
  getAppNavigationMode,
  logNavigationModeDev,
  type AppNavigationMode,
} from '@/utils/app-navigation-mode';

export type WorkdayScrollFocus = 'current-stop' | 'route-map' | null;

type WorkdayActionHandlers = {
  onAddStop?: () => void;
  onEditRoute?: () => void;
};

type WorkdayNavigationContextValue = {
  destination: WorkdayDockDestination;
  focusScrollTarget: WorkdayScrollFocus;
  handlers: WorkdayActionHandlers;
  liveRouteViewMode: LiveRouteViewMode;
  mode: AppNavigationMode;
  /** Hides pre-workday bottom tabs (Preview, Active Workday, etc.). */
  preWorkdayTabBarHidden: boolean;
  registerHandlers: (handlers: WorkdayActionHandlers) => void;
  requestScrollTo: (target: WorkdayScrollFocus) => void;
  setDestination: (destination: WorkdayDockDestination) => void;
  setLiveRouteViewMode: (mode: LiveRouteViewMode) => void;
  setPreWorkdayTabBarHidden: (hidden: boolean) => void;
};

const WorkdayNavigationContext = createContext<WorkdayNavigationContextValue | null>(
  null,
);

export function WorkdayNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isRestoring, isWorkdayActive } = useWorkdayTrackerContext();
  const { phase: visitCompletionPhase } = useVisitAdvancement();

  const [destination, setDestination] = useState<WorkdayDockDestination>('current-stop');
  const [liveRouteViewMode, setLiveRouteViewMode] =
    useState<LiveRouteViewMode>('current-stop');
  const [focusScrollTarget, setFocusScrollTarget] = useState<WorkdayScrollFocus>(null);
  const [preWorkdayTabBarHidden, setPreWorkdayTabBarHidden] = useState(false);
  const handlersRef = useRef<WorkdayActionHandlers>({});

  const mode = useMemo(
    () =>
      getAppNavigationMode({
        isRestoring,
        isWorkdayActive,
        visitCompletionPhase,
      }),
    [isRestoring, isWorkdayActive, visitCompletionPhase],
  );

  useEffect(() => {
    logNavigationModeDev(mode, visitCompletionPhase, isWorkdayActive);
  }, [isWorkdayActive, mode, visitCompletionPhase]);

  useEffect(() => {
    if (mode === 'workday') {
      return;
    }

    setDestination('current-stop');
    setLiveRouteViewMode('current-stop');
    setFocusScrollTarget(null);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'completion' || isRestoring) {
      return;
    }

    if (pathname.includes('visit-history')) {
      router.replace('/' as const);
    }
  }, [isRestoring, mode, pathname, router]);

  const registerHandlers = useCallback((handlers: WorkdayActionHandlers) => {
    handlersRef.current = handlers;
  }, []);

  const requestScrollTo = useCallback((target: WorkdayScrollFocus) => {
    setFocusScrollTarget(target);
  }, []);

  const value = useMemo(
    (): WorkdayNavigationContextValue => ({
      destination,
      focusScrollTarget,
      get handlers() {
        return handlersRef.current;
      },
      liveRouteViewMode,
      mode,
      preWorkdayTabBarHidden,
      registerHandlers,
      requestScrollTo,
      setDestination,
      setLiveRouteViewMode,
      setPreWorkdayTabBarHidden,
    }),
    [
      destination,
      focusScrollTarget,
      liveRouteViewMode,
      mode,
      preWorkdayTabBarHidden,
      registerHandlers,
      requestScrollTo,
    ],
  );

  return (
    <WorkdayNavigationContext.Provider value={value}>
      {children}
    </WorkdayNavigationContext.Provider>
  );
}

export function useWorkdayNavigation(): WorkdayNavigationContextValue {
  const context = useContext(WorkdayNavigationContext);

  if (!context) {
    throw new Error('useWorkdayNavigation must be used within WorkdayNavigationProvider');
  }

  return context;
}

export function useOptionalWorkdayNavigation(): WorkdayNavigationContextValue | null {
  return useContext(WorkdayNavigationContext);
}

export function useAppNavigationModeValue(): AppNavigationMode {
  return useWorkdayNavigation().mode;
}

export type { CompletionPhase };
