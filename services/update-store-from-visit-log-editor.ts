import { geocodeAddressForConfirmation } from '@/services/address-geocoding';
import { getStoreById, upsertStore } from '@/services/stores';
import { invalidateRoutePlanningEstimate } from '@/services/route-planning';
import { formatStoreAddress, type Store } from '@/types/store';
import type { StoreReceivingRestriction } from '@/types/store-receiving-restriction';
import { storeAddressChanged } from '@/utils/planning-edit-mode';
import {
  normalizeStoreReceivingRestriction,
  validateStoreReceivingRestriction,
} from '@/utils/store-receiving-restriction';
import type { ManagerPhoneType } from '@/types/manager-phone-type';
import {
  planningStoreEditorInputFromStore,
  type PlanningStoreEditorInput,
} from '@/services/update-store-from-planning';
import {
  resolveManagerPhoneTypeForSave,
} from '@/utils/visit-log-manager-contact';

export type VisitLogStoreEditorInput = PlanningStoreEditorInput & {
  managerName?: string;
  managerPhone?: string;
  managerPhoneType?: ManagerPhoneType | null;
  receivingRestriction: StoreReceivingRestriction;
};

export type UpdateStoreFromVisitLogEditorResult =
  | { ok: true; store: Store }
  | { ok: false; error: string };

export function visitLogStoreEditorInputFromStore(store: Store): VisitLogStoreEditorInput {
  const base = planningStoreEditorInputFromStore(store);

  return {
    ...base,
    managerName: store.managerName ?? '',
    managerPhone: store.managerPhone ?? '',
    managerPhoneType: store.managerPhoneType ?? null,
    receivingRestriction: normalizeStoreReceivingRestriction(store.receivingRestriction ?? {
      type: 'none',
    }),
  };
}

export async function updateStoreFromVisitLogEditor(
  storeId: string,
  input: VisitLogStoreEditorInput,
): Promise<UpdateStoreFromVisitLogEditorResult> {
  const existing = await getStoreById(storeId);

  if (!existing) {
    return { ok: false, error: 'Store not found.' };
  }

  const receivingRestriction = normalizeStoreReceivingRestriction(input.receivingRestriction);
  const receivingValidation = validateStoreReceivingRestriction(receivingRestriction);

  if (receivingValidation) {
    return { ok: false, error: receivingValidation };
  }

  const trimmedName = input.name.trim();

  if (trimmedName.length === 0) {
    return { ok: false, error: 'Store name is required.' };
  }

  const trimmedPhone = input.managerPhone?.trim() || undefined;
  const managerPhoneType = resolveManagerPhoneTypeForSave({
    existingPhone: existing.managerPhone,
    existingType: existing.managerPhoneType,
    nextPhone: trimmedPhone,
    selectedType: input.managerPhoneType ?? null,
  });

  const draft: Store = {
    ...existing,
    name: trimmedName,
    storeNumber: input.storeNumber?.trim() || undefined,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() || undefined,
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
    managerName: input.managerName?.trim() || undefined,
    managerPhone: trimmedPhone,
    managerPhoneType,
    receivingRestriction:
      receivingRestriction.type === 'none' ? undefined : receivingRestriction,
    operatingHours: existing.operatingHours,
    updatedAt: Date.now(),
  };

  if (
    draft.addressLine1.length === 0 ||
    draft.city.length === 0 ||
    draft.state.length === 0 ||
    draft.postalCode.length === 0
  ) {
    return { ok: false, error: 'Address, city, state, and ZIP are required.' };
  }

  if (!storeAddressChanged(existing, draft)) {
    await upsertStore(draft);
    await invalidateRoutePlanningEstimate();

    return { ok: true, store: draft };
  }

  const geocodeResult = await geocodeAddressForConfirmation(formatStoreAddress(draft));

  if (geocodeResult.status === 'not_found') {
    return {
      ok: false,
      error: "We couldn't find that address. Add the city and state, then try again.",
    };
  }

  if (geocodeResult.status === 'unavailable') {
    return { ok: false, error: geocodeResult.message };
  }

  const updated: Store = {
    ...draft,
    latitude: geocodeResult.confirmation.latitude,
    longitude: geocodeResult.confirmation.longitude,
  };

  await upsertStore(updated);
  await invalidateRoutePlanningEstimate();

  return { ok: true, store: updated };
}
