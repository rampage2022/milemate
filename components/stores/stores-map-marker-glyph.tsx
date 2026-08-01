import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';

const MARKER_SIZE = 36;

type StoresMapMarkerGlyphProps = {
  abbreviation: string;
  backgroundColor: string;
  foregroundColor: string;
};

export function StoresMapMarkerGlyph({
  abbreviation,
  backgroundColor,
  foregroundColor,
}: StoresMapMarkerGlyphProps) {
  return (
    <View collapsable={false} pointerEvents="none" style={styles.frame}>
      <View style={[styles.circle, { backgroundColor }]}>
        <Text
          allowFontScaling={false}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
          style={[styles.label, { color: foregroundColor }]}
        >
          {abbreviation}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    height: MARKER_SIZE,
    justifyContent: 'center',
    width: MARKER_SIZE,
  },
  circle: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2,
    height: MARKER_SIZE,
    justifyContent: 'center',
    minWidth: MARKER_SIZE,
    paddingHorizontal: 4,
    shadowColor: AppColors.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
});

export const STORES_MAP_MARKER_SIZE = MARKER_SIZE;
