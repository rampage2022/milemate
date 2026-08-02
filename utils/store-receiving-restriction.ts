import type { Store } from '@/types/store';
import type {
  RouteReceivingConstraint,
  StoreReceivingRestriction,
  StoreReceivingRestrictionKind,
} from '@/types/store-receiving-restriction';

export const MINUTES_PER_DAY = 24 * 60;

export function isValidMinuteOfDay(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

function clampMinuteOfDay(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const rounded = Math.round(value);

  if (rounded < 0) {
    return 0;
  }

  if (rounded >= MINUTES_PER_DAY) {
    return MINUTES_PER_DAY - 1;
  }

  return rounded;
}

export function minutesOfDayToDate(minutes: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMinutes(clampMinuteOfDay(minutes));
  return date;
}

export function dateToMinutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatMinutesOfDayForDisplay(
  minutes: number,
  locale?: string | string[],
): string {
  const date = minutesOfDayToDate(minutes);
  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function normalizeStoreReceivingRestriction(
  value: unknown,
): StoreReceivingRestriction {
  if (value == null) {
    return { type: 'none' };
  }

  if (typeof value !== 'object') {
    return { type: 'none' };
  }

  const record = value as Record<string, unknown>;
  const type = record.type;

  if (type === 'none') {
    return { type: 'none' };
  }

  if (type === 'before' && typeof record.timeMinutes === 'number') {
    return {
      type: 'before',
      timeMinutes: clampMinuteOfDay(record.timeMinutes),
    };
  }

  if (type === 'after' && typeof record.timeMinutes === 'number') {
    return {
      type: 'after',
      timeMinutes: clampMinuteOfDay(record.timeMinutes),
    };
  }

  if (
    type === 'between' &&
    typeof record.startTimeMinutes === 'number' &&
    typeof record.endTimeMinutes === 'number'
  ) {
    return {
      type: 'between',
      startTimeMinutes: clampMinuteOfDay(record.startTimeMinutes),
      endTimeMinutes: clampMinuteOfDay(record.endTimeMinutes),
    };
  }

  return { type: 'none' };
}

/** Best-effort migration from legacy persisted store fields. */
export function normalizeReceivingRestrictionFromStoreRecord(
  record: Record<string, unknown>,
): StoreReceivingRestriction {
  if (record.receivingRestriction !== undefined) {
    return normalizeStoreReceivingRestriction(record.receivingRestriction);
  }

  const legacyHours = record.receivingHours;

  if (typeof legacyHours === 'string') {
    const parsed = parseLegacyReceivingHoursString(legacyHours);

    if (parsed) {
      return parsed;
    }
  }

  return { type: 'none' };
}

function parseLegacyReceivingHoursString(value: string): StoreReceivingRestriction | null {
  const trimmed = value.trim();

  if (trimmed.length === 0 || /^not set$/i.test(trimmed) || /^none$/i.test(trimmed)) {
    return null;
  }

  const beforeMatch = trimmed.match(/^before\s+(.+)$/i);

  if (beforeMatch) {
    const minutes = parseDisplayTimeToMinutes(beforeMatch[1]!.trim());

    if (minutes != null) {
      return { type: 'before', timeMinutes: minutes };
    }
  }

  const afterMatch = trimmed.match(/^after\s+(.+)$/i);

  if (afterMatch) {
    const minutes = parseDisplayTimeToMinutes(afterMatch[1]!.trim());

    if (minutes != null) {
      return { type: 'after', timeMinutes: minutes };
    }
  }

  return null;
}

function parseDisplayTimeToMinutes(display: string): number | null {
  const parsed = Date.parse(`1970-01-01 ${display}`);

  if (Number.isNaN(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  return date.getHours() * 60 + date.getMinutes();
}

export function applyNormalizedReceivingRestrictionToStore(store: Store): Store {
  const record = store as Store & Record<string, unknown>;
  const normalized = normalizeReceivingRestrictionFromStoreRecord(record);

  if (store.receivingRestriction && restrictionEquals(store.receivingRestriction, normalized)) {
    return store;
  }

  if (!store.receivingRestriction && normalized.type === 'none' && record.receivingHours === undefined) {
    return store;
  }

  return {
    ...store,
    receivingRestriction: normalized.type === 'none' ? undefined : normalized,
  };
}

function restrictionEquals(
  left: StoreReceivingRestriction,
  right: StoreReceivingRestriction,
): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === 'none' && right.type === 'none') {
    return true;
  }

  if (left.type === 'before' && right.type === 'before') {
    return left.timeMinutes === right.timeMinutes;
  }

  if (left.type === 'after' && right.type === 'after') {
    return left.timeMinutes === right.timeMinutes;
  }

  if (left.type === 'between' && right.type === 'between') {
    return (
      left.startTimeMinutes === right.startTimeMinutes &&
      left.endTimeMinutes === right.endTimeMinutes
    );
  }

  return false;
}

export function validateStoreReceivingRestriction(
  restriction: StoreReceivingRestriction,
): string | null {
  if (restriction.type === 'none') {
    return null;
  }

  if (restriction.type === 'before' || restriction.type === 'after') {
    if (!isValidMinuteOfDay(restriction.timeMinutes)) {
      return 'Choose a valid time.';
    }

    return null;
  }

  if (!isValidMinuteOfDay(restriction.startTimeMinutes)) {
    return 'Choose a valid start time.';
  }

  if (!isValidMinuteOfDay(restriction.endTimeMinutes)) {
    return 'Choose a valid end time.';
  }

  if (restriction.endTimeMinutes <= restriction.startTimeMinutes) {
    return 'End time must be after the start time.';
  }

  return null;
}

export function formatStoreReceivingRestrictionSummary(
  restriction: StoreReceivingRestriction,
  locale?: string | string[],
): string | null {
  if (restriction.type === 'none') {
    return null;
  }

  if (restriction.type === 'before') {
    return `Before ${formatMinutesOfDayForDisplay(restriction.timeMinutes, locale)}`;
  }

  if (restriction.type === 'after') {
    return `After ${formatMinutesOfDayForDisplay(restriction.timeMinutes, locale)}`;
  }

  const start = formatMinutesOfDayForDisplay(restriction.startTimeMinutes, locale);
  const end = formatMinutesOfDayForDisplay(restriction.endTimeMinutes, locale);

  return `${start}–${end}`;
}

export function formatVisitLogReceivingMetadataLine(
  restriction: StoreReceivingRestriction,
  locale?: string | string[],
): string | null {
  const summary = formatStoreReceivingRestrictionSummary(restriction, locale);

  if (!summary) {
    return null;
  }

  return `Receiving · ${summary}`;
}

export function getStoreReceivingRestrictionForDisplay(store: Store): StoreReceivingRestriction {
  if (store.receivingRestriction) {
    return normalizeStoreReceivingRestriction(store.receivingRestriction);
  }

  return normalizeReceivingRestrictionFromStoreRecord(
    store as Store & Record<string, unknown>,
  );
}

export function toRouteReceivingConstraint(
  restriction: StoreReceivingRestriction,
): RouteReceivingConstraint {
  const normalized = normalizeStoreReceivingRestriction(restriction);

  if (normalized.type === 'none') {
    return { kind: 'none' };
  }

  if (normalized.type === 'before') {
    return { kind: 'arrive-before', minuteOfDay: normalized.timeMinutes };
  }

  if (normalized.type === 'after') {
    return { kind: 'arrive-after', minuteOfDay: normalized.timeMinutes };
  }

  return {
    kind: 'arrival-window',
    startMinuteOfDay: normalized.startTimeMinutes,
    endMinuteOfDay: normalized.endTimeMinutes,
  };
}

export function storeReceivingRestrictionKindLabel(
  kind: StoreReceivingRestrictionKind,
): string {
  switch (kind) {
    case 'none':
      return 'No restriction';
    case 'before':
      return 'Arrive before';
    case 'after':
      return 'Arrive after';
    case 'between':
      return 'Arrive between';
    default:
      return 'No restriction';
  }
}
