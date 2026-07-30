import { geocodeAddressForConfirmation } from '@/services/address-geocoding';
import { getStoreById, upsertStore } from '@/services/stores';
import { invalidateRoutePlanningEstimate } from '@/services/route-planning';
import { formatStoreAddress, type Store } from '@/types/store';
import { storeAddressChanged } from '@/utils/planning-edit-mode';

export type PlanningStoreEditorInput = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  name: string;
  postalCode: string;
  state: string;
  storeNumber?: string;
};

export type UpdateStoreFromPlanningResult =
  | { ok: true; store: Store }
  | { ok: false; error: string };

export async function updateStoreFromPlanningEditor(
  storeId: string,
  input: PlanningStoreEditorInput,
): Promise<UpdateStoreFromPlanningResult> {
  const existing = await getStoreById(storeId);

  if (!existing) {
    return { ok: false, error: 'Store not found.' };
  }

  const trimmedName = input.name.trim();

  if (trimmedName.length === 0) {
    return { ok: false, error: 'Store name is required.' };
  }

  const draft: Store = {
    ...existing,
    name: trimmedName,
    storeNumber: input.storeNumber?.trim() || undefined,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() || undefined,
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
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

export function planningStoreEditorInputFromStore(store: Store): PlanningStoreEditorInput {
  return {
    name: store.name,
    storeNumber: store.storeNumber,
    addressLine1: store.addressLine1,
    addressLine2: store.addressLine2,
    city: store.city,
    state: store.state,
    postalCode: store.postalCode,
  };
}
