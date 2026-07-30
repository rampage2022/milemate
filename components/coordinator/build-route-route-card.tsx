import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BuildRouteLayout } from '@/components/coordinator/build-route-layout';
import { formatPlanningRouteLocationDisplay } from '@/components/coordinator/planning-address-display';
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
    kicker: 'Finish',
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

  const primaryLine = isUnset ? copy.unsetLabel : display.primary;
  let secondaryLine = isUnset ? '' : display.secondary;

  if (kind === 'finish' && returnToStart && !isUnset) {
    secondaryLine =
      secondaryLine.length > 0 ? `${secondaryLine} · Same as start` : 'Same as start location';
  }

  const accessibilityAddress = [primaryLine, secondaryLine].filter((part) => part.length > 0).join(', ');

  const content = (
    <>
      <View style={[styles.iconWrap, kind === 'start' ? styles.iconStart : styles.iconFinish]}>
        <Ionicons
          color={kind === 'start' ? AppColors.green : '#A78BFA'}
          name={copy.icon}
          size={16}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{copy.kicker}</Text>
        {isUnset ? (
          <Text numberOfLines={1} style={styles.primaryUnset}>
            {primaryLine}
          </Text>
        ) : (
          <>
            <Text numberOfLines={1} style={styles.primaryLine}>
              {primaryLine}
            </Text>
            {secondaryLine.length > 0 ? (
              <Text numberOfLines={1} style={styles.secondaryLine}>
                {secondaryLine}
              </Text>
            ) : null}
          </>
        )}
      </View>
      {interactive ? (
        <Ionicons color={AppColors.textMuted} name="chevron-forward" size={16} />
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <Pressable
        accessibilityLabel={`${copy.kicker}, ${accessibilityAddress}`}
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
    borderRadius: BuildRouteLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: BuildRouteLayout.routeListEndpointHeight,
    paddingHorizontal: BuildRouteLayout.cardPaddingH,
    paddingVertical: 8,
    width: '100%',
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
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
    gap: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  kicker: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  primaryLine: {
    color: AppColors.textPrimary,
    fontSize: BuildRouteLayout.endpointAddressSize,
    fontWeight: '700',
    lineHeight: 18,
  },
  primaryUnset: {
    color: AppColors.blue,
    fontSize: BuildRouteLayout.endpointAddressSize,
    fontWeight: '600',
    lineHeight: 18,
  },
  secondaryLine: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
  },
});
