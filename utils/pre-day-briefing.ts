import type { Store } from '@/types/store';
import type { SavedLocation } from '@/types/saved-location';
import type { TodayRouteSelection } from '@/types/today-route-selection';
import type { StoreVisit } from '@/types/store-visit';
import {
  buildAdaptiveRouteBriefing,
  type AdaptiveRouteBriefing,
} from '@/utils/route-briefing';

export const MAX_BRIEFING_NOTES = 3;
export const MAX_BRIEFING_NOTE_LENGTH = 120;

export type BriefingNote = {
  storeId: string;
  storeName: string;
  routeOrder: number;
  text: string;
};

export type PreDayBriefing = {
  totalStops: number;
  deliveryCount: number | null;
  priorityCount: number | null;
  importantNotes: BriefingNote[];
  route: AdaptiveRouteBriefing;
};

export type TodayScreenMode =
  | 'loading'
  | 'pre_day_briefing'
  | 'no_stops'
  | 'active_workday'
  | 'completed_day';

function sortVisitsByRouteOrder(visits: StoreVisit[]): StoreVisit[] {
  return [...visits].sort((left, right) => left.routeOrder - right.routeOrder);
}

export function countFinishedVisits(visits: StoreVisit[]): number {
  return visits.filter(
    (visit) => visit.status === 'completed' || visit.status === 'skipped',
  ).length;
}

export function isTodayRouteFullyComplete(visits: StoreVisit[]): boolean {
  return visits.length > 0 && countFinishedVisits(visits) === visits.length;
}

export function resolveTodayScreenMode(input: {
  isRestoring: boolean;
  isLoading: boolean;
  isWorkdayActive: boolean;
  visits: StoreVisit[];
}): TodayScreenMode {
  if (input.isRestoring || input.isLoading) {
    return 'loading';
  }

  if (input.isWorkdayActive) {
    return 'active_workday';
  }

  if (input.visits.length === 0) {
    return 'no_stops';
  }

  if (isTodayRouteFullyComplete(input.visits)) {
    return 'completed_day';
  }

  return 'pre_day_briefing';
}

function normalizeNoteText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Visit notes are the only note source in the current data model.
 * All non-empty visit notes are treated as briefing-worthy until
 * a dedicated importance or store-note field exists.
 */
export function buildPreDayBriefing(
  visits: StoreVisit[],
  storesById: Record<string, Store>,
  todayRouteSelection: TodayRouteSelection,
  myLocations: SavedLocation[],
): PreDayBriefing {
  const sortedVisits = sortVisitsByRouteOrder(visits);
  const seenNotes = new Set<string>();
  const importantNotes: BriefingNote[] = [];

  for (const visit of sortedVisits) {
    const store = storesById[visit.storeId];
    const storeName = store?.name ?? 'Store';
    const notes = [...visit.notes].sort(
      (left, right) => left.createdAt - right.createdAt,
    );

    for (const note of notes) {
      const text = normalizeNoteText(note.text);

      if (!text) {
        continue;
      }

      const dedupeKey = text.toLowerCase();

      if (seenNotes.has(dedupeKey)) {
        continue;
      }

      seenNotes.add(dedupeKey);

      importantNotes.push({
        storeId: visit.storeId,
        storeName,
        routeOrder: visit.routeOrder,
        text,
      });

      if (importantNotes.length >= MAX_BRIEFING_NOTES) {
        break;
      }
    }

    if (importantNotes.length >= MAX_BRIEFING_NOTES) {
      break;
    }
  }

  return {
    totalStops: visits.length,
    deliveryCount: null,
    priorityCount: null,
    importantNotes,
    route: buildAdaptiveRouteBriefing({
      selection: todayRouteSelection,
      locations: myLocations,
      stopCount: visits.length,
      visits,
      storesById,
    }),
  };
}

export function truncateBriefingNote(text: string, maxLength = MAX_BRIEFING_NOTE_LENGTH): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
