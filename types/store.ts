import type { StoreReceivingRestriction } from '@/types/store-receiving-restriction';
import type { ManagerPhoneType } from '@/types/manager-phone-type';

export type { ManagerPhoneType } from '@/types/manager-phone-type';

export type Store = {
  id: string;
  name: string;
  storeNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  /** Cached reverse-geocode line for display when structured address is missing. */
  reverseGeocodedAddressLine?: string;
  managerName?: string;
  managerPhone?: string;
  /** When `mobile`, Visit Log may offer SMS; unset legacy numbers are call-only. */
  managerPhoneType?: ManagerPhoneType;
  /** Normalized receiving window for route planning (minutes after local midnight). */
  receivingRestriction?: StoreReceivingRestriction;
  /** Legacy free-text receiving label; preserved on disk, migrated on read when needed. */
  receivingHours?: string;
  /** Local store hours as minutes after midnight (close minute is exclusive). */
  operatingHours?: {
    closeMinutes: number;
    openMinutes: number;
  };
  createdAt: number;
  updatedAt: number;
};

import {
  hasUsableStructuredAddress,
  resolveStoreDisplayAddressLine,
} from '@/utils/store-display-address-core';
import { formatStructuredStoreMailingAddress } from '@/utils/store-identity-presentation';

export function formatStoreAddress(store: Store): string {
  if (!hasUsableStructuredAddress(store)) {
    return resolveStoreDisplayAddressLine(store);
  }

  return formatStructuredStoreMailingAddress(store);
}
