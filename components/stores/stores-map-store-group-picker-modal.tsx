import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppColors } from '@/components/shared/app-theme';
import {
  addStoresToGroup,
  createStoreGroup,
  removeStoreFromAllGroups,
} from '@/services/store-groups';
import type { StoreGroup } from '@/types/store-group';

type StoresMapStoreGroupPickerModalProps = {
  groups: StoreGroup[];
  onClose: () => void;
  onGroupsChanged: () => void;
  storeId: string;
  visible: boolean;
};

export function StoresMapStoreGroupPickerModal({
  groups,
  onClose,
  onGroupsChanged,
  storeId,
  visible,
}: StoresMapStoreGroupPickerModalProps) {
  const [busy, setBusy] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setCreateMode(false);
      setNewGroupName('');
      setErrorMessage(null);
      setBusy(false);
    }
  }, [visible]);

  const memberGroupIds = new Set(
    groups.filter((group) => group.storeIds.includes(storeId)).map((group) => group.id),
  );

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setErrorMessage(null);

      try {
        await action();
        onGroupsChanged();
        onClose();
      } catch (error) {
        console.warn('[StoresMapGroupPicker]', error);
        setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.');
      } finally {
        setBusy(false);
      }
    },
    [onClose, onGroupsChanged],
  );

  const handleSelectUnassigned = useCallback(() => {
    void runAction(async () => {
      await removeStoreFromAllGroups(storeId);
    });
  }, [runAction, storeId]);

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      void runAction(async () => {
        await removeStoreFromAllGroups(storeId);
        await addStoresToGroup(groupId, [storeId]);
      });
    },
    [runAction, storeId],
  );

  const handleCreateGroup = useCallback(() => {
    const name = newGroupName.trim();

    if (name.length === 0) {
      setErrorMessage('Group name is required');
      return;
    }

    void runAction(async () => {
      await removeStoreFromAllGroups(storeId);
      await createStoreGroup({ name, storeIds: [storeId] });
    });
  }, [newGroupName, runAction, storeId]);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close group menu" onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
          <Text style={styles.title}>Store group</Text>
          <Text style={styles.subtitle}>Assign this store without leaving the map.</Text>

          {errorMessage ? (
            <Text allowFontScaling style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}

          {createMode ? (
            <View style={styles.createBlock}>
              <TextInput
                autoFocus
                editable={!busy}
                onChangeText={setNewGroupName}
                placeholder="Group name"
                placeholderTextColor={AppColors.textMuted}
                style={styles.input}
                value={newGroupName}
              />
              <View style={styles.createActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    setCreateMode(false);
                    setNewGroupName('');
                  }}
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryActionText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={handleCreateGroup}
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryActionText}>Create</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={handleSelectUnassigned}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <Text style={styles.rowLabel}>Unassigned</Text>
                  {memberGroupIds.size === 0 ? (
                    <Ionicons color={AppColors.blue} name="checkmark" size={18} />
                  ) : null}
                </Pressable>
                {groups.map((group) => (
                  <Pressable
                    key={group.id}
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => {
                      handleSelectGroup(group.id);
                    }}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Text allowFontScaling numberOfLines={1} style={styles.rowLabel}>
                      {group.name}
                    </Text>
                    {memberGroupIds.has(group.id) ? (
                      <Ionicons color={AppColors.blue} name="checkmark" size={18} />
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  setCreateMode(true);
                }}
                style={({ pressed }) => [styles.createRow, pressed && styles.pressed]}
              >
                <Ionicons color={AppColors.blue} name="add-circle-outline" size={20} />
                <Text style={styles.createRowText}>Create new group</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    maxHeight: '70%',
    padding: 16,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: AppColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    maxHeight: 280,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: AppColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 10,
  },
  rowLabel: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  createRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingVertical: 8,
  },
  createRowText: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '700',
  },
  createBlock: {
    gap: 12,
  },
  input: {
    backgroundColor: AppColors.background,
    borderColor: AppColors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    color: AppColors.textPrimary,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  createActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: AppColors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryActionText: {
    color: AppColors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
