import type { Store } from '@/types/store';
import {
  normalizeAddressComponentsForMatching,
  normalizeFullAddressForMatching,
  normalizeWhitespace,
} from '@/utils/store-import/address-utils';

function normalizeStoreNumber(value: string | undefined): string {
  return normalizeWhitespace(value ?? '').toLowerCase();
}

function addressComponentKey(store: Store): string {
  return normalizeAddressComponentsForMatching({
    addressLine1: store.addressLine1,
    city: store.city,
    state: store.state,
    postalCode: store.postalCode,
  });
}

function coordinatesMatch(left: Store, right: Store): boolean {
  if (
    typeof left.latitude !== 'number' ||
    typeof left.longitude !== 'number' ||
    typeof right.latitude !== 'number' ||
    typeof right.longitude !== 'number'
  ) {
    return false;
  }

  return (
    Math.abs(left.latitude - right.latitude) < 0.00005 &&
    Math.abs(left.longitude - right.longitude) < 0.00005
  );
}

/** True when two library entries likely represent the same physical store (e.g. after re-import). */
export function storesLikelyRepresentSameLocation(left: Store, right: Store): boolean {
  if (left.id === right.id) {
    return true;
  }

  const leftNumber = normalizeStoreNumber(left.storeNumber);
  const rightNumber = normalizeStoreNumber(right.storeNumber);

  if (leftNumber.length > 0 && leftNumber === rightNumber) {
    return true;
  }

  if (coordinatesMatch(left, right)) {
    return true;
  }

  const leftComponents = addressComponentKey(left);
  const rightComponents = addressComponentKey(right);

  if (
    leftComponents.replace(/\|/g, '').length > 0 &&
    leftComponents === rightComponents
  ) {
    return true;
  }

  const leftStreet = normalizeFullAddressForMatching(left.addressLine1);
  const rightStreet = normalizeFullAddressForMatching(right.addressLine1);

  if (leftStreet.length > 0 && leftStreet === rightStreet) {
    const leftCity = normalizeWhitespace(left.city).toLowerCase();
    const rightCity = normalizeWhitespace(right.city).toLowerCase();

    if (leftCity.length > 0 && leftCity === rightCity) {
      return true;
    }
  }

  return false;
}

type StoreCluster = {
  canonicalStoreId: string;
  memberStoreIds: string[];
};

export function buildDuplicateStoreClusters(
  stores: Store[],
  orderCountByStoreId: Map<string, number>,
): StoreCluster[] {
  const parent = new Map<string, string>();

  function find(storeId: string): string {
    const existing = parent.get(storeId);

    if (!existing || existing === storeId) {
      parent.set(storeId, storeId);
      return storeId;
    }

    const root = find(existing);
    parent.set(storeId, root);

    return root;
  }

  function union(leftId: string, rightId: string): void {
    const leftRoot = find(leftId);
    const rightRoot = find(rightId);

    if (leftRoot !== rightRoot) {
      parent.set(rightRoot, leftRoot);
    }
  }

  for (let index = 0; index < stores.length; index += 1) {
    const left = stores[index]!;

    for (let inner = index + 1; inner < stores.length; inner += 1) {
      const right = stores[inner]!;

      if (storesLikelyRepresentSameLocation(left, right)) {
        union(left.id, right.id);
      }
    }
  }

  const clustersByRoot = new Map<string, Store[]>();

  for (const store of stores) {
    const root = find(store.id);
    const cluster = clustersByRoot.get(root) ?? [];
    cluster.push(store);
    clustersByRoot.set(root, cluster);
  }

  const clusters: StoreCluster[] = [];

  for (const clusterStores of clustersByRoot.values()) {
    if (clusterStores.length < 2) {
      continue;
    }

    const canonical = [...clusterStores].sort((left, right) => {
      const updatedDiff = right.updatedAt - left.updatedAt;

      if (updatedDiff !== 0) {
        return updatedDiff;
      }

      return (
        (orderCountByStoreId.get(right.id) ?? 0) -
        (orderCountByStoreId.get(left.id) ?? 0)
      );
    })[0]!;

    clusters.push({
      canonicalStoreId: canonical.id,
      memberStoreIds: clusterStores.map((store) => store.id).sort(),
    });
  }

  return clusters;
}

/** Maps non-canonical duplicate store IDs to the canonical ID in each cluster. */
export function buildStoreIdRemapFromClusters(clusters: StoreCluster[]): Map<string, string> {
  const remap = new Map<string, string>();

  for (const cluster of clusters) {
    for (const memberId of cluster.memberStoreIds) {
      if (memberId !== cluster.canonicalStoreId) {
        remap.set(memberId, cluster.canonicalStoreId);
      }
    }
  }

  return remap;
}

export function resolveRemappedStoreId(
  storeId: string,
  remap: Map<string, string>,
): string {
  let current = storeId;
  const visited = new Set<string>();

  while (remap.has(current) && !visited.has(current)) {
    visited.add(current);
    current = remap.get(current)!;
  }

  return current;
}
