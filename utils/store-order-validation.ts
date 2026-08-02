import type { StoreOrder } from '@/types/store-order';

export function isCurrentSchemaStoreOrder(value: unknown): value is StoreOrder {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.storeId === 'string' &&
    typeof record.placedAt === 'string' &&
    typeof record.expectedDeliveryDate === 'string' &&
    (record.status === 'pending' ||
      record.status === 'delivered' ||
      record.status === 'missed') &&
    (record.deliveredAt === undefined || typeof record.deliveredAt === 'string') &&
    (record.note === undefined || typeof record.note === 'string') &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

export function describeStoreOrderRecordShape(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `array(len=${value.length})`;
  }

  if (typeof value !== 'object') {
    return typeof value;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();

  return `object{${keys.join(',')}}`;
}

/** ISO or MM-DD-YY — metadata only, no content logging. */
export function inferOrderTimestampMs(record: Record<string, unknown>): number | null {
  const candidates = [
    record.updatedAt,
    record.createdAt,
    record.placedAt,
    record.deliveredAt,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.length === 0) {
      continue;
    }

    const parsed = Date.parse(candidate);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function orderRecordHasNote(record: Record<string, unknown>): boolean {
  return typeof record.note === 'string' && record.note.trim().length > 0;
}
