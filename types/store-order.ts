export type StoreOrderStatus = 'pending' | 'delivered';

export type StoreOrder = {
  createdAt: string;
  deliveredAt?: string;
  expectedDeliveryDate: string;
  id: string;
  note?: string;
  placedAt: string;
  status: StoreOrderStatus;
  storeId: string;
  updatedAt: string;
};

export type CreateStoreOrderInput = {
  expectedDeliveryDate: string;
  note?: string;
  placedAt: string;
  storeId: string;
};

/** Lightweight shape for order summary cards. */
export type StoreOrderSummary = Pick<StoreOrder, 'expectedDeliveryDate' | 'id'>;
