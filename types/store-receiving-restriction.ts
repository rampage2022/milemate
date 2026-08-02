export type StoreReceivingRestriction =
  | {
      type: 'none';
    }
  | {
      type: 'before';
      timeMinutes: number;
    }
  | {
      type: 'after';
      timeMinutes: number;
    }
  | {
      type: 'between';
      startTimeMinutes: number;
      endTimeMinutes: number;
    };

export type RouteReceivingConstraint =
  | { kind: 'none' }
  | { kind: 'arrive-before'; minuteOfDay: number }
  | { kind: 'arrive-after'; minuteOfDay: number }
  | {
      kind: 'arrival-window';
      startMinuteOfDay: number;
      endMinuteOfDay: number;
    };

export type StoreReceivingRestrictionKind = StoreReceivingRestriction['type'];
