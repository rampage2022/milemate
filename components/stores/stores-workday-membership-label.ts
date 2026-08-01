import type { WorkdayTemplate } from '@/types/workday-template';
import type { StoreWorkdayAssignmentEntry } from '@/utils/store-workday-assignment-index';

export function formatStoreWorkdayMembershipLabel(input: {
  assignment: StoreWorkdayAssignmentEntry | undefined;
  templatesById: Map<string, WorkdayTemplate>;
}): string | null {
  const { assignment, templatesById } = input;

  if (!assignment || assignment.workdayIds.length === 0) {
    return null;
  }

  const primaryId = assignment.primaryWorkdayId ?? assignment.workdayIds[0];
  const primary = primaryId ? templatesById.get(primaryId) : undefined;
  const primaryName = primary?.name?.trim();

  if (!primaryName) {
    return null;
  }

  const extraCount = assignment.workdayIds.length - 1;

  if (extraCount <= 0) {
    return primaryName;
  }

  return `${primaryName} +${extraCount}`;
}
