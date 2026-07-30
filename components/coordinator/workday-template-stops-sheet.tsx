import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, {
  OpacityDecorator,
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

import { closeAllSwipeActions, SwipeActionRow } from '@/components/shared/swipe-action-row';
import { AppColors } from '@/components/shared/app-theme';
import { deleteWorkdayTemplate, updateWorkdayTemplate } from '@/services/workday-templates';
import type { WorkdayTemplate, WorkdayTemplateStop } from '@/types/workday-template';

const LONG_PRESS_DELAY_MS = 400;

type WorkdayTemplateStopsSheetProps = {
  onClose: () => void;
  onDeleted: () => void;
  onRequestRename: (template: WorkdayTemplate) => void;
  onUpdated: () => void;
  template: WorkdayTemplate | null;
  visible: boolean;
};

export function WorkdayTemplateStopsSheet({
  onClose,
  onDeleted,
  onRequestRename,
  onUpdated,
  template,
  visible,
}: WorkdayTemplateStopsSheetProps) {
  const [stops, setStops] = useState<WorkdayTemplateStop[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setStops(template?.stops ?? []);
  }, [template]);

  if (!template) {
    return null;
  }

  async function persistStops(nextStops: WorkdayTemplateStop[]) {
    await updateWorkdayTemplate(template!.id, { stops: nextStops });
    onUpdated();
  }

  function handleRemoveStop(stop: WorkdayTemplateStop) {
    const templateName = template?.name ?? 'this workday';

    Alert.alert(
      'Remove stop?',
      `Remove this stop from ${templateName}? The store stays in your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const nextStops = stops.filter((entry) => entry.id !== stop.id);
            setStops(nextStops);
            void persistStops(nextStops);
          },
        },
      ],
    );
  }

  function renderItem({
    drag,
    isActive,
    item,
  }: RenderItemParams<WorkdayTemplateStop>) {
    return (
      <SwipeActionRow
        actionBorderRadius={14}
        enabled={!isDragging}
        rowId={item.id}
        rowSpacing={10}
        rightAction={{
          accessibilityLabel: `Remove ${item.displayName} from workday`,
          backgroundColor: AppColors.red,
          label: 'Remove',
          onPress: () => {
            handleRemoveStop(item);
          },
        }}
      >
        <OpacityDecorator activeOpacity={0.96}>
          <ScaleDecorator activeScale={1.01}>
            <Pressable
              accessibilityHint="Press and hold, then drag to reorder"
              accessibilityLabel={`Stop ${item.displayName}`}
              delayLongPress={LONG_PRESS_DELAY_MS}
              disabled={isActive}
              onLongPress={() => {
                closeAllSwipeActions();
                drag();
              }}
              style={[styles.row, isActive && styles.rowActive]}
            >
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.name}>
                  {item.displayName}
                </Text>
                <Text numberOfLines={2} style={styles.address}>
                  {item.address}
                </Text>
              </View>
            </Pressable>
          </ScaleDecorator>
        </OpacityDecorator>
      </SwipeActionRow>
    );
  }

  return (
    <Modal
      animationType="slide"
      onDismiss={() => {
        closeAllSwipeActions();
        setIsDragging(false);
      }}
      onRequestClose={() => {
        closeAllSwipeActions();
        onClose();
      }}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close workday editor" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{template.name}</Text>
          <Text style={styles.subtitle}>
            Long press to reorder. Swipe left to remove a stop from this workday.
          </Text>

          <DraggableFlatList
            activationDistance={12}
            containerStyle={styles.list}
            data={stops}
            keyExtractor={(item) => item.id}
            onDragBegin={() => {
              closeAllSwipeActions();
              setIsDragging(true);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onDragEnd={({ data: nextStops }) => {
              setIsDragging(false);
              setStops(nextStops);
              void persistStops(nextStops);
            }}
            onRelease={() => {
              setIsDragging(false);
            }}
            renderItem={renderItem}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onRequestRename(template);
            }}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Rename Workday</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Alert.alert(
                `Delete ${template.name}?`,
                'This removes the saved workday template only.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      void deleteWorkdayTemplate(template.id).then(() => {
                        onDeleted();
                        onClose();
                      });
                    },
                  },
                ],
              );
            }}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteButtonText}>Delete Workday</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelButtonText}>Done</Text>
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
    maxHeight: '82%',
    padding: 20,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    marginTop: 6,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowActive: {
    borderColor: AppColors.blue,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  address: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    alignItems: 'center',
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: AppColors.red,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
