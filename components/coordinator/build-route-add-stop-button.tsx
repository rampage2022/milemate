import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { AppColors } from '@/components/shared/app-theme';

type BuildRouteAddStopButtonProps = {
  onPress: () => void;
};

export function BuildRouteAddStopButton({ onPress }: BuildRouteAddStopButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Add Stop"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons color={AppColors.blue} name="add" size={18} />
      <Text style={styles.label}>Add Stop</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'rgba(96, 120, 160, 0.55)',
    borderRadius: BuildRouteLayout.cardRadius,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: BuildRouteLayout.addStopButtonMinHeight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '100%',
  },
  label: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
