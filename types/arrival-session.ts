export type ArrivalSessionStatus =
  | 'inactive'
  | 'outside'
  | 'candidate'
  | 'dwelling'
  | 'arrived'
  | 'handled';

export type ArrivalSessionState = {
  visitId: string | null;
  storeId: string | null;
  status: ArrivalSessionStatus;
  firstInsideAt: number | null;
  lastInsideAt: number | null;
  consecutiveInsideReadings: number;
  lastDistanceMeters: number | null;
  lastAccuracyMeters: number | null;
  arrivedAt: number | null;
  handledAt: number | null;
  isInsideZone: boolean;
};

export type ArrivalEvent =
  | { type: 'candidate_started' }
  | { type: 'dwell_started' }
  | { type: 'arrival_confirmed' }
  | { type: 'arrival_exited' }
  | { type: 'arrival_reset' };

export type ArrivalRejectionReason =
  | 'no_store_coordinates'
  | 'no_location'
  | 'poor_accuracy'
  | 'stale_location'
  | 'visit_not_eligible'
  | 'workday_inactive'
  | null;

export function createInitialArrivalSessionState(): ArrivalSessionState {
  return {
    visitId: null,
    storeId: null,
    status: 'inactive',
    firstInsideAt: null,
    lastInsideAt: null,
    consecutiveInsideReadings: 0,
    lastDistanceMeters: null,
    lastAccuracyMeters: null,
    arrivedAt: null,
    handledAt: null,
    isInsideZone: false,
  };
}
