import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPlanningRouteLocationDisplay } from '@/components/coordinator/planning-address-display';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteLocation } from '@/types/route-location';

export type RouteEndpointKind = 'start' | 'finish';

const ENDPOINT_COPY: Record<
  RouteEndpointKind,
  { icon: keyof typeof Ionicons.glyphMap; kicker: string; unsetLabel: string }
> = {
  start: {
    icon: 'navigate-circle-outline',
    kicker: 'Start',
    unsetLabel: 'Set start location',
  },
  finish: {
    icon: 'flag-outline',
    kicker: 'Finish',
    unsetLabel: 'Set finish location',
  },
};

type RouteEndpointCardProps = {
  kind: RouteEndpointKind;
  location: RouteLocation | null;
  locked?: boolean;
  onPress?: () => void;
};

export function RouteEndpointCard({
  kind,
  location,
  locked = false,
  onPress,
}: RouteEndpointCardProps) {
  const copy = ENDPOINT_COPY[kind];
  const display = formatPlanningRouteLocationDisplay(location, copy.unsetLabel);
  const isUnset = location === null;
  const primary = isUnset ? copy.unsetLabel : display.primary;
  const secondary = isUnset ? '' : display.secondary;
  const interactive = !locked && Boolean(onPress);

  const content = (
    <>
      <View style={[styles.iconWrap, kind === 'start' ? styles.iconStart : styles.iconFinish]}>
        <Ionicons
          color={kind === 'start' ? AppColors.blue : '#7C3AED'}
          name={copy.icon}
          size={20}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{copy.kicker}</Text>
        <Text numberOfLines={1} style={[styles.primary, isUnset && styles.primaryUnset]}>
          {primary}
        </Text>
        {secondary.length > 0 ? (
          <Text numberOfLines={1} style={styles.secondary}>
            {secondary}
          </Text>
        ) : null}
      </View>
      {interactive ? (
        <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <Pressable
        accessibilityLabel={`${copy.kicker}, ${primary}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="text" style={[styles.card, styles.cardReadonly]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  cardReadonly: {
    backgroundColor: '#F9FAFB',
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconStart: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  iconFinish: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  copy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  kicker: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  primary: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryUnset: {
    color: AppColors.blue,
    fontWeight: '600',
  },
  secondary: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
