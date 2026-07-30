import { createContext, useContext, type ReactNode } from 'react';

import { useWorkdayTracker } from '@/hooks/use-workday-tracker';

type WorkdayTrackerContextValue = ReturnType<typeof useWorkdayTracker>;

const WorkdayTrackerContext = createContext<WorkdayTrackerContextValue | null>(
  null,
);

export function WorkdayTrackerProvider({ children }: { children: ReactNode }) {
  const value = useWorkdayTracker();

  return (
    <WorkdayTrackerContext.Provider value={value}>
      {children}
    </WorkdayTrackerContext.Provider>
  );
}

export function useWorkdayTrackerContext(): WorkdayTrackerContextValue {
  const context = useContext(WorkdayTrackerContext);

  if (!context) {
    throw new Error(
      'useWorkdayTrackerContext must be used within WorkdayTrackerProvider',
    );
  }

  return context;
}
