import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  addMyLocation,
  deleteMyLocation,
  editMyLocation,
  getMyLocations,
} from '@/services/my-locations';
import type { SavedLocation } from '@/types/saved-location';

export function useMyLocations() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const loaded = await getMyLocations();
      setLocations(loaded);
    } catch (error) {
      console.error('[useMyLocations] load failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createLocation = useCallback(
    async (input: {
      label: string;
      address: string;
      latitude?: number | null;
      longitude?: number | null;
    }) => {
      const created = await addMyLocation(input);
      await refresh();
      return created;
    },
    [refresh],
  );

  const updateLocation = useCallback(
    async (
      locationId: string,
      input: {
        label: string;
        address: string;
        latitude?: number | null;
        longitude?: number | null;
      },
    ) => {
      const updated = await editMyLocation(locationId, input);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const removeLocation = useCallback(
    async (locationId: string) => {
      await deleteMyLocation(locationId);
      await refresh();
    },
    [refresh],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    locations,
    isLoading,
    refresh,
    createLocation,
    updateLocation,
    removeLocation,
  };
}
