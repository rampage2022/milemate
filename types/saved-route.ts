export type SavedRouteStop = {
  storeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export type SavedRoute = {
  id: string;
  name: string;
  stops: SavedRouteStop[];
  createdAt: string;
  updatedAt: string;
};

export function createSavedRouteId(): string {
  return `route-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
