import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

type SurfaceCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function SurfaceCard({ children, style, padded = true }: SurfaceCardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: MileMateTokens.radiusCard,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    padding: 16,
  },
});
