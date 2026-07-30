import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors, AppSpacing } from '@/components/shared/app-theme';

type RouteLauncherActionProps = {
  accessibilityLabel: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor: string;
  onPress: () => void;
  title: string;
};

function RouteLauncherAction({
  accessibilityLabel,
  description,
  icon,
  iconBackgroundColor,
  iconColor,
  onPress,
  title,
}: RouteLauncherActionProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons color={iconColor} name={icon} size={22} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Ionicons color={AppColors.textMuted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

type RouteLauncherScreenProps = {
  onLoadRoute: () => void;
  onNewRoute: () => void;
  onOpenWorkdayHistory: () => void;
};

export function RouteLauncherScreen({
  onLoadRoute,
  onNewRoute,
  onOpenWorkdayHistory,
}: RouteLauncherScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Today&apos;s Route</Text>
        <Text style={styles.subtitle}>No route is currently loaded.</Text>
        <Text style={styles.lede}>Choose how you&apos;d like to begin.</Text>
      </View>

      <View style={styles.actions}>
        <RouteLauncherAction
          accessibilityLabel="New route. Create today's route by selecting stores from your store list."
          description="Create today's route by selecting stores from your store list."
          icon="add-circle-outline"
          iconBackgroundColor="#DBEAFE"
          iconColor={AppColors.blue}
          onPress={onNewRoute}
          title="New Route"
        />
        <RouteLauncherAction
          accessibilityLabel="Load route. Open one of your previously saved routes."
          description="Open one of your previously saved routes."
          icon="folder-open-outline"
          iconBackgroundColor="#E0E7FF"
          iconColor="#4F46E5"
          onPress={onLoadRoute}
          title="Load Route"
        />
        <RouteLauncherAction
          accessibilityLabel="Workday history. Review completed workdays, mileage, and visit history."
          description="Review completed workdays, mileage, and visit history."
          icon="book-outline"
          iconBackgroundColor="#ECFDF5"
          iconColor="#059669"
          onPress={onOpenWorkdayHistory}
          title="Workday History"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppSpacing.sectionGap,
    paddingTop: 8,
    width: '100%',
  },
  hero: {
    gap: 8,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: PlanningLayout.sectionTitleSize + 4,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  lede: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    width: '100%',
  },
  actionCard: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  actionPressed: {
    opacity: 0.9,
  },
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  actionTitle: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  actionDescription: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
