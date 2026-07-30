import { formatStoreAddress, type Store } from '@/types/store';

export function shouldClearPlanningEditMode(remainingStopCount: number): boolean {
  return remainingStopCount === 0;
}

export function storeAddressChanged(before: Store, after: Store): boolean {
  return formatStoreAddress(before) !== formatStoreAddress(after);
}
