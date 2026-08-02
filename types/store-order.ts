export type StoreOrderStatus = 'pending' | 'delivered' | 'missed';

export type StoreOrderConfirmationSource = 'visit-log-deliveries' | 'legacy';

export type StoreOrder = {
  createdAt: string;
  /** When the delivery outcome was confirmed (ISO). */
  confirmedAt?: string;
  confirmationSource?: StoreOrderConfirmationSource;
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
