import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppColors } from '@/components/shared/app-theme';
import {
  STORES_MAP_OVERLAY_CONTROL_GAP,
  STORES_MAP_OVERLAY_CONTROL_HEIGHT,
} from '@/utils/stores-map-map-controls-layout';

type StoresMapOverlayControlsProps = {
  onMyLocation: () => void;
  onShowAll: () => void;
  top: number;
  visible: boolean;
};

export function StoresMapOverlayControls({
  onMyLocation,
  onShowAll,
  top,
  visible,
}: StoresMapOverlayControlsProps) {
  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.host, { top }]}>
      <Pressable
        accessibilityLabel="Center map on my location"
        accessibilityRole="button"
        onPress={onMyLocation}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons color={AppColors.textPrimary} name="locate" size={18} />
      </Pressable>
      <Pressable
        accessibilityLabel="Show all visible stores"
        accessibilityRole="button"
        onPress={onShowAll}
        style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.pressed]}
      >
        <Ionicons color={AppColors.textPrimary} name="scan-outline" size={18} />
        <Text style={styles.buttonLabel}>Show all</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    gap: STORES_MAP_OVERLAY_CONTROL_GAP,
    position: 'absolute',
    right: 12,
    zIndex: 4,
  },
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 14, 20, 0.92)',
    borderColor: AppColors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: STORES_MAP_OVERLAY_CONTROL_HEIGHT,
    paddingHorizontal: 10,
  },
  buttonSecondary: {
    paddingHorizontal: 10,
  },
  buttonLabel: {
    color: AppColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
