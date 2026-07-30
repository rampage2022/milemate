import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { WorkdayTemplate } from '@/types/workday-template';

type SavedWorkdaysSheetProps = {
  canSaveCurrent: boolean;
  onClose: () => void;
  onManageTemplate: (template: WorkdayTemplate) => void;
  onSaveCurrent: () => void;
  onSelectTemplate: (template: WorkdayTemplate) => void;
  templates: WorkdayTemplate[];
  visible: boolean;
};

export function SavedWorkdaysSheet({
  canSaveCurrent,
  onClose,
  onManageTemplate,
  onSaveCurrent,
  onSelectTemplate,
  templates,
  visible,
}: SavedWorkdaysSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close saved workdays" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Saved Workdays</Text>
          <ScrollView contentContainerStyle={styles.content}>
            {templates.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No saved workdays yet</Text>
                <Text style={styles.emptyBody}>
                  Build your current stop list, then save it as a reusable workday.
                </Text>
              </View>
            ) : (
              templates.map((template) => (
                <View key={template.id} style={styles.rowContainer}>
                  <Pressable
                    accessibilityLabel={`${template.name}, ${template.stops.length} stops`}
                    accessibilityRole="button"
                    onPress={() => {
                      onSelectTemplate(template);
                    }}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateMeta}>
                      {template.stops.length === 1
                        ? '1 stop'
                        : `${template.stops.length} stops`}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Manage ${template.name}`}
                    accessibilityRole="button"
                    onPress={() => {
                      onManageTemplate(template);
                    }}
                    style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.manageButtonText}>Edit stops</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          <Pressable
            accessibilityLabel="Save current as workday"
            accessibilityRole="button"
            disabled={!canSaveCurrent}
            onPress={onSaveCurrent}
            style={({ pressed }) => [
              styles.primaryButton,
              !canSaveCurrent && styles.primaryButtonDisabled,
              pressed && canSaveCurrent && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Save Current as Workday</Text>
          </Pressable>
          {!canSaveCurrent ? (
            <Text style={styles.helperText}>
              Add at least one stop before saving a workday.
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    padding: 20,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  content: {
    gap: 8,
    paddingBottom: 16,
  },
  emptyState: {
    gap: 8,
    paddingVertical: 8,
  },
  emptyTitle: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  rowContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  row: {
    flex: 1,
    gap: 2,
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  templateName: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  templateMeta: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  manageButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  manageButtonText: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    color: AppColors.textMuted,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
