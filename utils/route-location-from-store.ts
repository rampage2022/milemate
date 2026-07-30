import { formatStoreAddress, type Store } from '@/types/store';
import { createRouteLocationId, type RouteLocation } from '@/types/route-location';
import { getStoreDisplayName } from '@/utils/get-store-display-name';

export function routeLocationFromStore(store: Store): RouteLocation {
  return {
    formattedAddress: formatStoreAddress(store),
    id: createRouteLocationId(),
    latitude: store.latitude ?? 0,
    longitude: store.longitude ?? 0,
    name: getStoreDisplayName(store),
    source: 'manual',
  };
}
