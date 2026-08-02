import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getLocalMinuteOfDay } from '@/utils/minute-of-day';

export function useLiveMinuteOfDay(): number {
  const [minuteOfDay, setMinuteOfDay] = useState(() => getLocalMinuteOfDay());

  useEffect(() => {
    function syncNow() {
      setMinuteOfDay(getLocalMinuteOfDay());
    }

    const intervalId = setInterval(syncNow, 60_000);

    function handleAppState(nextState: AppStateStatus) {
      if (nextState === 'active') {
        syncNow();
      }
    }

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  return minuteOfDay;
}
