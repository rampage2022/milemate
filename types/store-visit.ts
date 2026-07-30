export type StoreVisitStatus =
  | 'pending'
  | 'current'
  | 'checked_in'
  | 'completed'
  | 'skipped';

export type VisitSkipReason =
  | 'store_closed'
  | 'no_delivery'
  | 'return_later'
  | 'time_constraint'
  | 'route_changed'
  | 'other';

export type StoreVisitNote = {
  id: string;
  text: string;
  createdAt: number;
};

import type { AfterCompletionMode } from '@/types/after-completion';

export type StoreVisit = {
  id: string;
  storeId: string;
  scheduledDate: string;
  routeOrder: number;
  status: StoreVisitStatus;
  tripId?: string;
  checkedInAt?: number;
  checkInSource?: 'manual' | 'automatic';
  automaticCheckInAt?: number;
  completedAt?: number;
  /** Wall-clock visit length when completed (ms), from checkedInAt when present. */
  visitDurationMs?: number;
  skipReason?: VisitSkipReason;
  afterCompletionOverride?: AfterCompletionMode;
  notes: StoreVisitNote[];
  createdAt: number;
  updatedAt: number;
};

export type StoreVisitStateSnapshot = {
  status: StoreVisitStatus;
  checkedInAt?: number;
  completedAt?: number;
};

export type VisitAdvancementSnapshot = {
  completedVisitId: string;
  completedVisitState: StoreVisitStateSnapshot;
  promotedVisitId: string | null;
  promotedVisitState: StoreVisitStateSnapshot | null;
};
