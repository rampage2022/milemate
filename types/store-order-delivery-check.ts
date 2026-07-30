import type { StoreOrder } from '@/types/store-order';

export type DeliveryCheckOutcome = 'not_received';

export type StoreOrderDeliveryCheck = {
  checkedAt: string;
  createdAt: string;
  id: string;
  orderId: string;
  outcome: DeliveryCheckOutcome;
  storeId: string;
  visitId?: string;
};

export type CreateStoreOrderDeliveryCheckInput = {
  orderId: string;
  outcome: DeliveryCheckOutcome;
  storeId: string;
  visitId?: string;
};

export type UnresolvedStoreDelivery = {
  latestNotReceivedCheck: StoreOrderDeliveryCheck;
  order: StoreOrder;
  storeId: string;
};
