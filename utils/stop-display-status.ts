import type { ArrivalSessionStatus } from '@/types/arrival-session';
import type { StoreVisit } from '@/types/store-visit';
import { resolveCurrentStopPhase } from '@/utils/current-stop-phase';

export type StopDisplayStatus =
  | 'completed'
  | 'skipped'
  | 'checked_in'
  | 'arriving'
  | 'en_route'
  | null;

export type StopDisplayStatusInput = {
  arrivalStatus?: ArrivalSessionStatus;
  hasArrived?: boolean;
  isActiveStop: boolean;
  visit: StoreVisit;
};

export const StopDisplayStatusLabels = {
  arriving: 'Arriving',
  checked_in: 'Checked In',
  en_route: 'En Route',
} as const;

function isArrivalSessionIndicatingArriving(
  arrivalStatus: ArrivalSessionStatus | undefined,
): boolean {
  return (
    arrivalStatus === 'candidate' ||
    arrivalStatus === 'dwelling' ||
    arrivalStatus === 'arrived'
  );
}

export function getStopDisplayStatus(input: StopDisplayStatusInput): StopDisplayStatus {
  if (input.visit.status === 'completed') {
    return 'completed';
  }

  if (input.visit.status === 'skipped') {
    return 'skipped';
  }

  if (!input.isActiveStop) {
    return null;
  }

  if (input.visit.status === 'checked_in') {
    return 'checked_in';
  }

  const phase = resolveCurrentStopPhase(
    input.visit.status,
    input.hasArrived === true,
  );

  if (phase === 'visit_in_progress') {
    return 'checked_in';
  }

  if (
    phase === 'arrived' ||
    (input.visit.status === 'current' &&
      isArrivalSessionIndicatingArriving(input.arrivalStatus))
  ) {
    return 'arriving';
  }

  if (input.visit.status === 'current') {
    return 'en_route';
  }

  return 'en_route';
}

export function getStopDisplayStatusLabel(
  status: StopDisplayStatus,
): string | null {
  if (status === 'arriving') {
    return StopDisplayStatusLabels.arriving;
  }

  if (status === 'checked_in') {
    return StopDisplayStatusLabels.checked_in;
  }

  if (status === 'en_route') {
    return StopDisplayStatusLabels.en_route;
  }

  return null;
}

export function isActiveStopVisit(input: {
  currentVisitId: string | null;
  visit: StoreVisit;
}): boolean {
  if (input.visit.status === 'completed' || input.visit.status === 'skipped') {
    return false;
  }

  return (
    input.visit.id === input.currentVisitId ||
    input.visit.status === 'current' ||
    input.visit.status === 'checked_in'
  );
}
