import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { formatPlanningRouteLocationDisplay } from '@/components/coordinator/planning-address-display';
import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';
import type { RouteLocation } from '@/types/route-location';

type CompactRouteEndpointsProps = {
  endLocation: RouteLocation | null;
  onEditEnd: () => void;
  onEditStart: () => void;
  onReturnToStartChange: (enabled: boolean) => void;
  returnToStart: boolean;
  startLocation: RouteLocation | null;
};

function EndpointIcon({
  backgroundColor,
  glyph,
}: {
  backgroundColor: string;
  glyph: string;
}) {
  return (
    <View style={[styles.iconCircle, { backgroundColor }]}>
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </View>
  );
}

function EndpointRow({
  iconBackgroundColor,
  iconGlyph,
  label,
  location,
  onPress,
  placeholder,
  primaryOverride,
  secondaryOverride,
  showConnector,
}: {
  iconBackgroundColor: string;
  iconGlyph: string;
  label: string;
  location: RouteLocation | null;
  onPress?: () => void;
  placeholder: string;
  primaryOverride?: string;
  secondaryOverride?: string;
  showConnector: boolean;
}) {
  const display = formatPlanningRouteLocationDisplay(location, placeholder);
  const primary = primaryOverride ?? display.primary;
  const secondary = secondaryOverride ?? display.secondary;

  const content = (
    <>
      <EndpointIcon backgroundColor={iconBackgroundColor} glyph={iconGlyph} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text numberOfLines={1} style={styles.value}>
          {primary}
        </Text>
        {secondary.length > 0 ? (
          <Text numberOfLines={2} style={styles.subvalue}>
            {secondary}
          </Text>
        ) : null}
      </View>
      <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
    </>
  );

  return (
    <View style={styles.endpointBlock}>
      {onPress ? (
        <Pressable
          accessibilityLabel={`${label} location, ${primary}`}
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.endpointRow, pressed && styles.pressed]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.endpointRow}>{content}</View>
      )}
      {showConnector ? <View style={styles.connector} /> : null}
    </View>
  );
}

export function CompactRouteEndpoints({
  endLocation,
  onEditEnd,
  onEditStart,
  onReturnToStartChange,
  returnToStart,
  startLocation,
}: CompactRouteEndpointsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Route</Text>

      <View style={styles.card}>
        <EndpointRow
          iconBackgroundColor="#FEE2E2"
          iconGlyph="🚩"
          label="Start"
          location={startLocation}
          onPress={onEditStart}
          placeholder="Choose start"
          showConnector
        />

        {returnToStart ? (
          <EndpointRow
            iconBackgroundColor="#F3F4F6"
            iconGlyph="🏁"
            label="End"
            location={null}
            placeholder="Same as start"
            primaryOverride="Same as start"
            secondaryOverride="Return to start location"
            showConnector={false}
          />
        ) : (
          <EndpointRow
            iconBackgroundColor="#F3F4F6"
            iconGlyph="🏁"
            label="End"
            location={endLocation}
            onPress={onEditEnd}
            placeholder="Choose end"
            showConnector={false}
          />
        )}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Return to start location</Text>
        <Switch
          accessibilityLabel="Return to start location"
          onValueChange={onReturnToStartChange}
          trackColor={{ false: '#D1D5DB', true: AppColors.blue }}
          value={returnToStart}
        />
      </View>

      {returnToStart ? (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmIcon}>🏁</Text>
          <Text style={styles.confirmText}>Same as start</Text>
          <Ionicons color={AppColors.blue} name="checkmark" size={20} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  sectionTitle: {
    color: AppColors.textPrimary,
    fontSize: PlanningLayout.sectionTitleSize,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  endpointBlock: {
    position: 'relative',
  },
  endpointRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: PlanningLayout.cardPaddingH,
    paddingVertical: PlanningLayout.cardPaddingV,
  },
  connector: {
    borderLeftColor: AppColors.border,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    bottom: 10,
    left: 31,
    position: 'absolute',
    top: 52,
    width: 0,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconGlyph: {
    fontSize: 16,
    lineHeight: 20,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  label: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  subvalue: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 2,
  },
  toggleLabel: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  confirmRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 2,
  },
  confirmIcon: {
    fontSize: 18,
    lineHeight: 22,
    width: 24,
  },
  confirmText: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
