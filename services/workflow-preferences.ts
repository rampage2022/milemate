import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AfterCompletionMode } from '@/types/after-completion';
import {
  DEFAULT_AUTO_CHECK_IN_MODE,
  isAutoCheckInMode,
  type AutoCheckInMode,
} from '@/types/auto-check-in';

const WORKFLOW_PREFERENCES_KEY = '@milemate/workflow-preferences';

type WorkflowPreferences = {
  afterCompletionDefault: AfterCompletionMode;
  autoCheckInMode: AutoCheckInMode;
};

const DEFAULT_PREFERENCES: WorkflowPreferences = {
  afterCompletionDefault: 'open_directions',
  autoCheckInMode: DEFAULT_AUTO_CHECK_IN_MODE,
};

function isAfterCompletionMode(value: unknown): value is AfterCompletionMode {
  return (
    value === 'open_directions' || value === 'ask' || value === 'stay_in_app'
  );
}

function parsePreferences(raw: string | null): WorkflowPreferences {
  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_PREFERENCES;
    }

    const record = parsed as Record<string, unknown>;

    if (isAfterCompletionMode(record.afterCompletionDefault)) {
      return {
        afterCompletionDefault: record.afterCompletionDefault,
        autoCheckInMode: isAutoCheckInMode(record.autoCheckInMode)
          ? record.autoCheckInMode
          : DEFAULT_AUTO_CHECK_IN_MODE,
      };
    }
  } catch {
    return DEFAULT_PREFERENCES;
  }

  return DEFAULT_PREFERENCES;
}

export async function getWorkflowPreferences(): Promise<WorkflowPreferences> {
  const stored = await AsyncStorage.getItem(WORKFLOW_PREFERENCES_KEY);

  return parsePreferences(stored);
}

export async function getAfterCompletionDefault(): Promise<AfterCompletionMode> {
  const preferences = await getWorkflowPreferences();

  return preferences.afterCompletionDefault;
}

export async function setAfterCompletionDefault(
  mode: AfterCompletionMode,
): Promise<void> {
  const preferences = await getWorkflowPreferences();

  await AsyncStorage.setItem(
    WORKFLOW_PREFERENCES_KEY,
    JSON.stringify({
      ...preferences,
      afterCompletionDefault: mode,
    }),
  );
}

export async function getAutoCheckInMode(): Promise<AutoCheckInMode> {
  const preferences = await getWorkflowPreferences();

  return preferences.autoCheckInMode;
}

export async function setAutoCheckInMode(mode: AutoCheckInMode): Promise<void> {
  const preferences = await getWorkflowPreferences();

  await AsyncStorage.setItem(
    WORKFLOW_PREFERENCES_KEY,
    JSON.stringify({
      ...preferences,
      autoCheckInMode: mode,
    }),
  );
}
