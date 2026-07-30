import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { AppColors } from '@/components/shared/app-theme';

type BuildRouteHeaderProps = {
  onBack: () => void;
  onOpenMenu?: () => void;
};

export function BuildRouteHeader({ onBack, onOpenMenu }: BuildRouteHeaderProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Back to home"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Ionicons color={AppColors.textPrimary} name="chevron-back" size={22} />
      </Pressable>

      <View style={styles.titleBlock}>
        <Text accessibilityRole="header" style={styles.title}>
          Build Your Route
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          Arrange your stops for today
        </Text>
      </View>

      <Pressable
        accessibilityLabel="More options"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onOpenMenu}
        style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
      >
        <Ionicons color={AppColors.textSecondary} name="ellipsis-horizontal" size={22} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 28,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: BuildRouteLayout.headerTitleSize,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: BuildRouteLayout.headerSubtitleSize,
    lineHeight: 17,
  },
  menuButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: {
    opacity: 0.88,
  },
});
