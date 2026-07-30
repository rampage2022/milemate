import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const TICK_MS = 1_000;

export function useVisitElapsedMs(checkedInAt: number | undefined): number | null {
  const [elapsedMs, setElapsedMs] = useState<number | null>(() =>
    typeof checkedInAt === 'number' ? Math.max(0, Date.now() - checkedInAt) : null,
  );

  useEffect(() => {
    if (typeof checkedInAt !== 'number') {
      setElapsedMs(null);
      return;
    }

    const update = () => {
      setElapsedMs(Math.max(0, Date.now() - checkedInAt));
    };

    update();
    const intervalId = setInterval(update, TICK_MS);

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        update();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [checkedInAt]);

  return elapsedMs;
}
