import type { Store } from '@/types/store';
import type { ManagerPhoneType } from '@/types/manager-phone-type';
import { resolveVisitLogManagerDisplayName } from '@/utils/visit-log-summary-presentation';

export type VisitLogManagerContactPresentation = {
  a11yContactName: string;
  displayName: string;
  showCall: boolean;
  showMessage: boolean;
  showRow: boolean;
};

export function resolveManagerPhoneTypeForSave(input: {
  existingPhone?: string;
  existingType?: ManagerPhoneType;
  nextPhone?: string;
  selectedType: ManagerPhoneType | null;
}): ManagerPhoneType | undefined {
  const nextPhone = input.nextPhone?.trim();

  if (!nextPhone) {
    return undefined;
  }

  if (input.selectedType) {
    return input.selectedType;
  }

  const hadPhone = Boolean(input.existingPhone?.trim());

  if (!hadPhone) {
    return 'mobile';
  }

  return input.existingType;
}

export function buildVisitLogManagerContactPresentation(
  store: Pick<Store, 'managerName' | 'managerPhone' | 'managerPhoneType'>,
): VisitLogManagerContactPresentation {
  const managerName = resolveVisitLogManagerDisplayName(store.managerName);
  const phone = store.managerPhone?.trim() ?? '';

  if (!managerName && !phone) {
    return {
      a11yContactName: 'Store contact',
      displayName: '',
      showCall: false,
      showMessage: false,
      showRow: false,
    };
  }

  const displayName = managerName ?? 'Store contact';
  const a11yContactName = managerName ?? 'Store contact';
  const showCall = phone.length > 0;
  const showMessage = showCall && store.managerPhoneType === 'mobile';

  return {
    a11yContactName,
    displayName,
    showCall,
    showMessage,
    showRow: true,
  };
}
