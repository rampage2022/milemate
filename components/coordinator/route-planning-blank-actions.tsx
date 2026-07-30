import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlanningLayout } from '@/components/coordinator/planning-layout';
import { AppColors } from '@/components/shared/app-theme';

type RoutePlanningBlankActionsProps = {
  onAddStores: () => void;
  onImportStores: () => void;
  onLoadRoute: () => void;
};

function BlankActionRow({
  accessibilityLabel,
  description,
  icon,
  onPress,
  title,
}: {
  accessibilityLabel: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons color={AppColors.blue} name={icon} size={20} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons color={AppColors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

export function RoutePlanningBlankActions({
  onAddStores,
  onImportStores,
  onLoadRoute,
}: RoutePlanningBlankActionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add stores to today&apos;s route</Text>
      <BlankActionRow
        accessibilityLabel="Add stores from your store list"
        description="Choose stores already in your library"
        icon="add-circle-outline"
        onPress={onAddStores}
        title="Add Stores"
      />
      <BlankActionRow
        accessibilityLabel="Import stores from a file"
        description="Bring in stores from CSV or pasted data"
        icon="cloud-upload-outline"
        onPress={onImportStores}
        title="Import Stores"
      />
      <BlankActionRow
        accessibilityLabel="Load a saved route"
        description="Use a route you saved previously"
        icon="folder-open-outline"
        onPress={onLoadRoute}
        title="Load Route"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingVertical: 8,
    width: '100%',
  },
  heading: {
    color: AppColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: PlanningLayout.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
