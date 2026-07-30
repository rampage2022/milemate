export type LocationDiagnosticEntry = {
  id: string;
  sequence: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  horizontalAccuracyMeters: number | null;
  speedMps: number | null;
  distanceFromPreviousMiles: number | null;
  segmentRunningTotalMiles: number;
  authoritativeDistanceBeforeMiles: number;
  authoritativeDistanceAfterMiles: number;
  displayedUiDistanceMiles: number | null;
  distanceSavedAtEndWorkdayMiles: number | null;
  ignored: boolean;
  ignoredReason: string | null;
};

export type LocationWatchSetting = {
  key: string;
  label: string;
  value: string;
  explanation: string;
};

export type LocationDiagnosticResetEvent = {
  id: string;
  timestamp: number;
  reason: string;
  authoritativeDistanceBeforeMiles: number;
  authoritativeDistanceAfterMiles: number;
  displayedUiDistanceMiles: number | null;
};
