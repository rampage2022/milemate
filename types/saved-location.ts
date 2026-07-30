export type SavedLocation = {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
};

export function createSavedLocationId(): string {
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
