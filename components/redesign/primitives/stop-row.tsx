import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MileMateTokens } from '@/components/redesign/tokens';

type StopRowProps = {
  accessibilityLabel: string;
  address: string;
  distanceLabel?: string;
  index?: number;
  leading?: React.ReactNode;
  name?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
};

export function StopRow({
  accessibilityLabel,
  address,
  distanceLabel,
  index,
  leading,
  name,
  onPress,
  trailing,
}: StopRowProps) {
  const title = name?.trim() || address;

  const content = (
    <>
      {leading ?? (
        index !== undefined ? (
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index}</Text>
          </View>
        ) : null
      )}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {name?.trim() ? (
          <Text numberOfLines={2} style={styles.address}>
            {address}
          </Text>
        ) : null}
      </View>
      {distanceLabel ? <Text style={styles.distance}>{distanceLabel}</Text> : null}
      {trailing ?? (onPress ? (
        <Ionicons color={MileMateTokens.textMuted} name="chevron-forward" size={18} />
      ) : null)}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.row}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: MileMateTokens.minTouchTarget,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  indexBadge: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.blueSoft,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  indexText: {
    color: MileMateTokens.blue,
    fontSize: 14,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: MileMateTokens.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  address: {
    color: MileMateTokens.textSecondary,
    fontSize: 14,
  },
  distance: {
    color: MileMateTokens.blue,
    fontSize: 14,
    fontWeight: '600',
  },
});
