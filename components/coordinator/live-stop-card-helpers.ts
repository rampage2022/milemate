import { formatVisitCompletionTime } from '@/utils/coordinator-screen-presentation';
import type { StoreVisit } from '@/types/store-visit';
import { formatVisitDurationLabel } from '@/utils/visit-duration';

export function getLiveStopCompletionTimeLabel(visit: StoreVisit): string | null {
  const duration = formatVisitDurationLabel(visit);

  if (duration) {
    return duration;
  }

  return formatVisitCompletionTime(visit.completedAt);
}
