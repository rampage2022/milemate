import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { computeStoresMapSheetSnapGeometry } from '@/components/stores/stores-map-sheet-snap';

export function useStoresMapSheetSnapGeometry(input: {
  bottomInset: number;
  collapsedHeightOverride?: number;
  tabBarHeight: number;
  topInset: number;
}) {
  const { height: windowHeight } = useWindowDimensions();

  return useMemo(
    () =>
      computeStoresMapSheetSnapGeometry({
        bottomInset: input.bottomInset,
        collapsedHeightOverride: input.collapsedHeightOverride,
        tabBarHeight: input.tabBarHeight,
        topInset: input.topInset,
        windowHeight,
      }),
    [input.bottomInset, input.collapsedHeightOverride, input.tabBarHeight, input.topInset, windowHeight],
  );
}
