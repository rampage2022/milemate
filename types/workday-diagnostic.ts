export type DiagnosticResetEvent = {
  timestamp: number;
  reason: string;
  authoritativeDistanceBeforeMiles: number;
  authoritativeDistanceAfterMiles: number;
  displayedUiDistanceMiles: number | null;
};

export type DiagnosticFix = {
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

export type WorkdayDiagnostic = {
  tripId: string;
  startedAt: string;
  endedAt?: string;
  fixes: DiagnosticFix[];
  resetEvents: DiagnosticResetEvent[];
  totalFixes: number;
  acceptedFixes: number;
  ignoredFixes: number;
  diagnosticDistanceMiles: number;
  distanceSavedAtEndWorkdayMiles: number | null;
};
