import { StyleSheet, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';

/** Diameter of the map marker circle (unselected). */
export const STORES_MAP_MARKER_CIRCLE_SIZE = 26;
/** Frame size when the selection ring is shown. */
export const STORES_MAP_MARKER_SELECTED_SIZE = 40;
const MARKER_CORE_DOT_SIZE = 8;

type StoresMapMarkerGlyphProps = {
  backgroundColor: string;
  selected?: boolean;
};

export function StoresMapMarkerGlyph({
  backgroundColor,
  selected = false,
}: StoresMapMarkerGlyphProps) {
  return (
    <View
      collapsable={false}
      pointerEvents="none"
      style={[styles.frame, selected && styles.frameSelected]}
    >
      {selected ? <View style={styles.selectionRing} /> : null}
      <View style={[styles.circle, { backgroundColor }]}>
        <View style={styles.centerDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    height: STORES_MAP_MARKER_CIRCLE_SIZE,
    justifyContent: 'center',
    width: STORES_MAP_MARKER_CIRCLE_SIZE,
  },
  frameSelected: {
    height: STORES_MAP_MARKER_SELECTED_SIZE,
    width: STORES_MAP_MARKER_SELECTED_SIZE,
  },
  selectionRing: {
    ...StyleSheet.absoluteFillObject,
    borderColor: AppColors.textPrimary,
    borderRadius: STORES_MAP_MARKER_SELECTED_SIZE / 2,
    borderWidth: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  circle: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.94)',
    borderRadius: STORES_MAP_MARKER_CIRCLE_SIZE / 2,
    borderWidth: 2,
    height: STORES_MAP_MARKER_CIRCLE_SIZE,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    width: STORES_MAP_MARKER_CIRCLE_SIZE,
  },
  centerDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: MARKER_CORE_DOT_SIZE / 2,
    height: MARKER_CORE_DOT_SIZE,
    width: MARKER_CORE_DOT_SIZE,
  },
});

/** @deprecated Use {@link STORES_MAP_MARKER_CIRCLE_SIZE}. */
export const STORES_MAP_MARKER_SIZE = STORES_MAP_MARKER_CIRCLE_SIZE;
