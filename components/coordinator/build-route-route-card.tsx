import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { formatPlanningRouteLocationDisplay } from '@/components/coordinator/planning-address-display';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteLocation } from '@/types/route-location';

export type BuildRouteRouteCardKind = 'start' | 'finish';

type BuildRouteRouteCardProps = {
  kind: BuildRouteRouteCardKind;
  location: RouteLocation | null;
  locked?: boolean;
  onPress?: () => void;
  returnToStart?: boolean;
};

const COPY: Record<
  BuildRouteRouteCardKind,
  { icon: keyof typeof Ionicons.glyphMap; kicker: string; unsetLabel: string }
> = {
  start: {
    icon: 'home-outline',
    kicker: 'Start',
    unsetLabel: 'Set start location',
  },
  finish: {
    icon: 'flag-outline',
    kicker: 'Final',
    unsetLabel: 'Set finish location',
  },
};

export function BuildRouteRouteCard({
  kind,
  location,
  locked = false,
  onPress,
  returnToStart = false,
}: BuildRouteRouteCardProps) {
  const copy = COPY[kind];
  const display = formatPlanningRouteLocationDisplay(location, copy.unsetLabel);
  const isUnset = location === null;
  const interactive = !locked && Boolean(onPress);

  let primary = isUnset ? copy.unsetLabel : display.primary;
  let secondary = isUnset ? '' : display.secondary;

  if (kind === 'finish' && returnToStart && !isUnset) {
    primary = display.primary;
    secondary = secondary.length > 0 ? `${secondary} · Same as start` : 'Same as start location';
  }

  const content = (
    <>
      <View style={[styles.iconWrap, kind === 'start' ? styles.iconStart : styles.iconFinish]}>
        <Ionicons
          color={kind === 'start' ? AppColors.green : '#A78BFA'}
          name={copy.icon}
          size={20}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{copy.kicker}</Text>
        <Text numberOfLines={1} style={[styles.name, isUnset && styles.nameUnset]}>
          {primary}
        </Text>
        {secondary.length > 0 ? (
          <Text numberOfLines={1} style={styles.address}>
            {secondary}
          </Text>
        ) : (
          <View style={styles.addressPlaceholder} />
        )}
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
    <View accessibilityRole="text" style={styles.card}>
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
    gap: 10,
    height: BuildRouteLayout.routeListRowHeight,
    paddingHorizontal: PlanningLayout.cardPaddingH,
    width: '100%',
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconStart: {
    backgroundColor: AppColors.greenSoft,
  },
  iconFinish: {
    backgroundColor: 'rgba(167, 139, 250, 0.16)',
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  kicker: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  name: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  nameUnset: {
    color: AppColors.blue,
    fontWeight: '600',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
  },
  addressPlaceholder: {
    height: 17,
  },
});
