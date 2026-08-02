import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/components/shared/app-theme';
import {
  createStoreGroup,
  deleteStoreGroup,
  getStoreGroups,
  updateStoreGroup,
} from '@/services/store-groups';
import { getStores } from '@/services/stores';
import type { StoreGroup } from '@/types/store-group';
import type { Store } from '@/types/store';
import { getStoreDisplayName } from '@/utils/get-store-display-name';
import { searchStores } from '@/utils/search-stores';

export function StoreGroupsManageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<StoreGroup[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState('');
  const [pickerQuery, setPickerQuery] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const reload = useCallback(() => {
    void (async () => {
      const [nextGroups, nextStores] = await Promise.all([getStoreGroups(), getStores()]);
      setGroups(nextGroups);
      setStores(nextStores);
    })();
  }, []);

  useFocusEffect(reload);

  const filteredStores = useMemo(
    () => searchStores(stores, pickerQuery),
    [pickerQuery, stores],
  );

  const toggleStore = useCallback((storeId: string) => {
    setSelectedStoreIds((current) => {
      const next = new Set(current);

      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }

      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      Alert.alert('Name required', 'Enter a group name.');
      return;
    }

    try {
      if (editingGroupId) {
        await updateStoreGroup(editingGroupId, {
          name: trimmed,
          storeIds: [...selectedStoreIds],
        });
      } else {
        await createStoreGroup({
          name: trimmed,
          storeIds: [...selectedStoreIds],
        });
      }

      setName('');
      setSelectedStoreIds(new Set());
      setEditingGroupId(null);
      const nextGroups = await getStoreGroups();
      setGroups(nextGroups);
    } catch (error) {
      console.error('[StoreGroups] save failed', error);
      Alert.alert('Could not save group');
    }
  }, [editingGroupId, name, selectedStoreIds]);

  const handleEdit = useCallback((group: StoreGroup) => {
    setEditingGroupId(group.id);
    setName(group.name);
    setSelectedStoreIds(new Set(group.storeIds));
  }, []);

  const handleDelete = useCallback((group: StoreGroup) => {
    Alert.alert(`Delete “${group.name}”?`, 'Stores are not deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteStoreGroup(group.id);
            setGroups(await getStoreGroups());
            if (editingGroupId === group.id) {
              setEditingGroupId(null);
              setName('');
              setSelectedStoreIds(new Set());
            }
          })();
        },
      },
    ]);
  }, [editingGroupId]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Store Groups
        </Text>
      </View>

      <TextInput
        accessibilityLabel="Group name"
        onChangeText={setName}
        placeholder="Group name"
        placeholderTextColor={AppColors.textMuted}
        style={styles.nameInput}
        value={name}
      />

      <TextInput
        accessibilityLabel="Search stores"
        onChangeText={setPickerQuery}
        placeholder="Search stores"
        placeholderTextColor={AppColors.textMuted}
        style={styles.searchInput}
        value={pickerQuery}
      />

      <FlatList
        data={filteredStores}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const selected = selectedStoreIds.has(item.id);

          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleStore(item.id)}
              style={styles.storeRow}
            >
              <Text style={styles.storeName}>{getStoreDisplayName(item)}</Text>
              <Text style={styles.storeMeta}>{selected ? 'Selected' : ''}</Text>
            </Pressable>
          );
        }}
        style={styles.storeList}
      />

      <Pressable accessibilityRole="button" onPress={() => void handleSave()} style={styles.saveButton}>
        <Text style={styles.saveLabel}>{editingGroupId ? 'Update Group' : 'Create Group'}</Text>
      </Pressable>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Saved groups</Text>}
        renderItem={({ item }) => (
          <View style={styles.groupRow}>
            <View style={styles.groupText}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupMeta}>{item.storeIds.length} stores</Text>
            </View>
            <Pressable onPress={() => handleEdit(item)}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => handleDelete(item)}>
              <Text style={[styles.link, styles.destructive]}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: AppColors.background,
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  back: {
    color: AppColors.blue,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  nameInput: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    color: AppColors.textPrimary,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    color: AppColors.textPrimary,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  storeList: {
    flexGrow: 0,
    maxHeight: 220,
  },
  storeRow: {
    borderBottomColor: AppColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  storeName: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  storeMeta: {
    color: AppColors.blue,
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: AppColors.blue,
    borderRadius: 10,
    marginVertical: 12,
    paddingVertical: 12,
  },
  saveLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  groupRow: {
    alignItems: 'center',
    borderBottomColor: AppColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  groupText: {
    flex: 1,
  },
  groupName: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  groupMeta: {
    color: AppColors.textMuted,
    fontSize: 12,
  },
  link: {
    color: AppColors.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  destructive: {
    color: '#DC2626',
  },
});
