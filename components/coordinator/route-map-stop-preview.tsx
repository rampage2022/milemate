import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { BriefingMapMarker } from '@/utils/briefing-route-map-model';

type RouteMapStopPreviewProps = {
  marker: BriefingMapMarker;
  onOpenStore: (storeId: string) => void;
};

export function RouteMapStopPreview({
  marker,
  onOpenStore,
}: RouteMapStopPreviewProps) {
  if (marker.kind !== 'stop' || !marker.storeId) {
    return null;
  }

  const storeLine =
    marker.storeNumber && marker.storeNumber.trim().length > 0
      ? `${marker.title ?? 'Stop'} #${marker.storeNumber.trim()}`
      : (marker.title ?? 'Stop');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        onOpenStore(marker.storeId!);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Stop {marker.stopNumber ?? '—'}</Text>
        <Text numberOfLines={1} style={styles.title}>
          {storeLine}
        </Text>
        {marker.subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {marker.subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={styles.action}>Open Store →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 10,
    flexDirection: 'row',
    gap: 10,
    left: 10,
    maxWidth: '92%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'absolute',
    right: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  copy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 12,
  },
  action: {
    color: AppColors.blue,
    flexShrink: 0,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.92,
  },
});
