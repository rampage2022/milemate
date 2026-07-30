import { StyleSheet, View } from 'react-native';

import {
  HOME_ACTION_CARD_GRADIENTS,
  type HomeActionCardVariant,
} from '@/components/home/home-action-card-gradients';
import { HomeLayout } from '@/components/home/home-layout';
import { AppColors } from '@/components/shared/app-theme';

type HomeActionCardBackgroundProps = {
  variant: HomeActionCardVariant;
};

/**
 * Left accent wash for home action cards (used after native rebuild with expo-linear-gradient).
 * Currently unused — cards use solid `AppColors.card` until then.
 */
export function HomeActionCardBackground({ variant }: HomeActionCardBackgroundProps) {
  const { accentColor } = HOME_ACTION_CARD_GRADIENTS[variant];

  return (
    <>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.baseFill]} />
      <View
        pointerEvents="none"
        style={[
          styles.glowOuter,
          {
            backgroundColor: accentColor,
            opacity: variant === 'workdayHistory' ? 0.08 : 0.22,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glowInner,
          {
            backgroundColor: accentColor,
            opacity: variant === 'workdayHistory' ? 0.14 : 0.32,
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  baseFill: {
    backgroundColor: AppColors.card,
  },
  glowOuter: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '72%',
  },
  glowInner: {
    borderBottomLeftRadius: HomeLayout.cardRadius,
    borderTopLeftRadius: HomeLayout.cardRadius,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '42%',
  },
});
