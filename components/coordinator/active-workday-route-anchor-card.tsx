import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { ActiveWorkdayReorderLayout } from '@/components/coordinator/active-workday-reorder-layout';
import { formatPlanningRouteLocationDisplay } from '@/components/coordinator/planning-address-display';
import { AppColors, MileMateTokens } from '@/components/shared/app-theme';
import type { RouteLocation } from '@/types/route-location';

import type { RouteEndpointKind } from '@/components/coordinator/route-endpoint-card';

const ENDPOINT_COPY: Record<
  RouteEndpointKind,
  { icon: keyof typeof Ionicons.glyphMap; kicker: string; unsetLabel: string }
> = {
  start: {
    icon: 'navigate-outline',
    kicker: 'Start',
    unsetLabel: 'Set start location',
  },
  finish: {
    icon: 'flag-outline',
    kicker: 'Finish',
    unsetLabel: 'Set finish location',
  },
};

type ActiveWorkdayRouteAnchorCardProps = {
  kind: RouteEndpointKind;
  location: RouteLocation | null;
};

export function ActiveWorkdayRouteAnchorCard({
  kind,
  location,
}: ActiveWorkdayRouteAnchorCardProps) {
  const copy = ENDPOINT_COPY[kind];
  const display = formatPlanningRouteLocationDisplay(location, copy.unsetLabel);
  const isUnset = location === null;

  return (
    <View accessibilityRole="text" style={styles.card}>
      <View style={[styles.iconWrap, kind === 'start' ? styles.iconStart : styles.iconFinish]}>
        <Ionicons
          color={kind === 'start' ? AppColors.blue : AppColors.purple}
          name={copy.icon}
          size={16}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{copy.kicker}</Text>
        {isUnset ? (
          <Text numberOfLines={1} style={styles.addressUnset}>
            {copy.unsetLabel}
          </Text>
        ) : (
          <>
            <Text numberOfLines={1} style={styles.streetLine}>
              {display.primary}
            </Text>
            {display.secondary.length > 0 ? (
              <Text numberOfLines={1} style={styles.cityLine}>
                {display.secondary}
              </Text>
            ) : null}
          </>
        )}
      </View>
      <View style={styles.lockBadge}>
        <Ionicons accessibilityLabel="Fixed stop" color={AppColors.textMuted} name="lock-closed" size={13} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: MileMateTokens.card,
    borderColor: MileMateTokens.cardBorder,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: ActiveWorkdayReorderLayout.anchorMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  iconStart: {
    backgroundColor: AppColors.blueSoft,
  },
  iconFinish: {
    backgroundColor: AppColors.purpleSoft,
  },
  copy: {
    flex: 1,
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
  streetLine: {
    color: AppColors.textPrimary,
    fontSize: ActiveWorkdayReorderLayout.anchorStreetSize,
    fontWeight: '700',
    lineHeight: 18,
  },
  cityLine: {
    color: AppColors.textSecondary,
    fontSize: ActiveWorkdayReorderLayout.anchorCitySize,
    lineHeight: 17,
  },
  addressUnset: {
    color: AppColors.textSecondary,
    fontStyle: 'italic',
    fontSize: ActiveWorkdayReorderLayout.anchorStreetSize,
    lineHeight: 18,
  },
  lockBadge: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    opacity: 0.85,
    width: 24,
  },
});
