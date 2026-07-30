import * as Location from 'expo-location';

import { getLocationWatchConfig } from '@/services/location';
import type { LocationWatchSetting } from '@/types/location-diagnostic';

function formatAccuracy(accuracy: Location.LocationOptions['accuracy']): string {
  if (accuracy === undefined) {
    return 'Not set';
  }

  if (typeof accuracy === 'number') {
    return `Level ${accuracy}`;
  }

  return String(accuracy);
}

export function getLocationWatchReference(): LocationWatchSetting[] {
  const config = getLocationWatchConfig();

  return [
    {
      key: 'accuracy',
      label: 'Accuracy',
      value: formatAccuracy(config.accuracy),
      explanation:
        'How aggressively the device uses GPS vs Wi‑Fi/cell. MileMate uses High, which favors precise GPS and uses more battery. Horizontal accuracy on each fix (in meters) shows how trustworthy that point is — lower is better. This is not a percentage; ~5–20 m is good, 50+ m is poor.',
    },
    {
      key: 'distanceInterval',
      label: 'Distance Interval',
      value:
        config.distanceInterval !== undefined
          ? `${config.distanceInterval} m`
          : 'Platform default',
      explanation:
        'Minimum movement in meters before a new update is delivered. Set to 10 m — the device may skip callbacks until you move roughly this far.',
    },
    {
      key: 'timeInterval',
      label: 'Time Interval',
      value:
        config.timeInterval !== undefined
          ? `${config.timeInterval} ms`
          : 'Platform default',
      explanation:
        'Android only: minimum time between updates in milliseconds. Set to 1000 ms (1 second). iOS does not use this option for watchPositionAsync.',
    },
    {
      key: 'deferredUpdates',
      label: 'Deferred Updates',
      value: 'Not configured',
      explanation:
        'iOS can defer location updates and deliver them in batches to save power (used with background APIs). MileMate foreground watch does not configure deferred updates.',
    },
    {
      key: 'foregroundService',
      label: 'Foreground Service',
      value: 'Not used (foreground watch only)',
      explanation:
        'Android requires a foreground service notification for background location. MileMate v1 uses foreground watchPositionAsync only — no foreground service is running.',
    },
    {
      key: 'activityType',
      label: 'Activity Type',
      value: 'Not configured',
      explanation:
        'iOS uses motion activity type (e.g. automotive navigation) to tune GPS for background sessions. Not set for the current foreground watch configuration.',
    },
    {
      key: 'pausesUpdatesAutomatically',
      label: 'Pause Updates Automatically',
      value: 'Platform default (typically true on iOS)',
      explanation:
        'When true, iOS may pause location updates if it detects you are stationary. Updates resume when movement is detected. MileMate does not override this.',
    },
  ];
}
