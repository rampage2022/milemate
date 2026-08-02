import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppColors } from '@/components/shared/app-theme';
import { StoresSearchField } from '@/components/stores/stores-search-field';
import { StoresSegmentedControl } from '@/components/stores/stores-segmented-control';
import type { StoresScope } from '@/components/stores/stores-screen';
import {
  STORES_MAP_FLOATING_HEADER_BACKPLATE_PADDING,
  STORES_MAP_FLOATING_HEADER_HORIZONTAL_INSET,
  STORES_MAP_FLOATING_HEADER_SCOPE_HEIGHT,
  STORES_MAP_FLOATING_HEADER_SEARCH_BUTTON_SIZE,
  STORES_MAP_FLOATING_HEADER_SEARCH_EDIT_ROW_HEIGHT,
  STORES_MAP_FLOATING_HEADER_TITLE_ROW_HEIGHT,
  STORES_MAP_FLOATING_HEADER_VERTICAL_GAP,
  computeStoresMapFloatingHeaderTop,
} from '@/utils/stores-map-sheet-layout';

type MapHeaderSearchMode = 'idle' | 'editing' | 'pill';

type StoresMapFloatingHeaderProps = {
  onBackToWorkdayPreview?: () => void;
  onClearSearch: () => void;
  onScopeChange: (scope: StoresScope) => void;
  scope: StoresScope;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showPreviewBack?: boolean;
  topInset: number;
  visible: boolean;
};

function resolveInitialSearchMode(query: string): MapHeaderSearchMode {
  return query.trim().length > 0 ? 'pill' : 'idle';
}

export function StoresMapFloatingHeader({
  onBackToWorkdayPreview,
  onClearSearch,
  onScopeChange,
  scope,
  searchQuery,
  setSearchQuery,
  showPreviewBack = false,
  topInset,
  visible,
}: StoresMapFloatingHeaderProps) {
  const inputRef = useRef<TextInput>(null);
  const [searchMode, setSearchMode] = useState<MapHeaderSearchMode>(() =>
    resolveInitialSearchMode(searchQuery),
  );

  const collapseFromEditing = useCallback(() => {
    if (searchQuery.trim().length > 0) {
      setSearchMode('pill');
    } else {
      setSearchMode('idle');
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!visible) {
      setSearchMode(resolveInitialSearchMode(searchQuery));
    }
  }, [searchQuery, visible]);

  useEffect(() => {
    if (searchQuery.trim().length === 0 && searchMode === 'pill') {
      setSearchMode('idle');
    }
  }, [searchMode, searchQuery]);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      if (searchMode === 'editing') {
        collapseFromEditing();
      }
    });

    return () => {
      sub.remove();
    };
  }, [collapseFromEditing, searchMode]);

  const openSearch = useCallback(() => {
    setSearchMode('editing');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    collapseFromEditing();
  }, [collapseFromEditing]);

  const handleClearQuery = useCallback(() => {
    onClearSearch();
    setSearchMode('idle');
  }, [onClearSearch]);

  const handleFieldClear = useCallback(() => {
    onClearSearch();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [onClearSearch]);

  const handleSearchBlur = useCallback(() => {
    requestAnimationFrame(() => {
      collapseFromEditing();
    });
  }, [collapseFromEditing]);

  if (!visible) {
    return null;
  }

  const pillLabel =
    searchQuery.trim().length > 20
      ? `${searchQuery.trim().slice(0, 20)}…`
      : searchQuery.trim();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: computeStoresMapFloatingHeaderTop({ topInset }) }]}
    >
      <View style={styles.backplate}>
        {searchMode === 'editing' ? (
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={styles.editingRow}
          >
            <StoresSearchField
              autoFocus
              compact
              inputRef={inputRef}
              onBlur={handleSearchBlur}
              onChangeText={setSearchQuery}
              onClear={handleFieldClear}
              value={searchQuery}
            />
            <Pressable
              accessibilityLabel="Cancel search"
              accessibilityRole="button"
              onPress={handleCancel}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={styles.titleRow}
          >
            {searchMode === 'idle' ? (
              <>
                {showPreviewBack && onBackToWorkdayPreview ? (
                  <Pressable
                    accessibilityLabel="Back to Workday Preview"
                    accessibilityRole="button"
                    hitSlop={4}
                    onPress={onBackToWorkdayPreview}
                    style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                  >
                    <Ionicons color={AppColors.textPrimary} name="chevron-back" size={22} />
                  </Pressable>
                ) : null}
                <Text accessibilityRole="header" allowFontScaling style={styles.title}>
                  Stores
                </Text>
                <Pressable
                  accessibilityLabel="Search stores"
                  accessibilityRole="button"
                  onPress={openSearch}
                  style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
                >
                  <Ionicons color={AppColors.textPrimary} name="search" size={20} />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityHint="Tap to edit search"
                  accessibilityLabel={`Filtering stores by ${searchQuery.trim()}`}
                  accessibilityRole="button"
                  onPress={openSearch}
                  style={({ pressed }) => [styles.queryPillMain, pressed && styles.pressed]}
                >
                  <Ionicons color={AppColors.textSecondary} name="search" size={15} />
                  <Text allowFontScaling numberOfLines={1} style={styles.queryPillText}>
                    {pillLabel}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Clear search filter"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={handleClearQuery}
                  style={({ pressed }) => [styles.pillClearOuter, pressed && styles.pressed]}
                >
                  <Ionicons color={AppColors.textSecondary} name="close-circle" size={18} />
                </Pressable>
              </>
            )}
          </Animated.View>
        )}

        <View style={styles.scopeWrap}>
          <StoresSegmentedControl
            compact
            onChange={onScopeChange}
            segments={[
              {
                accessibilityLabel: 'Stores on today’s route',
                id: 'today',
                label: 'Today',
              },
              {
                accessibilityLabel: 'All saved stores',
                id: 'all',
                label: 'All Stores',
              },
            ]}
            value={scope}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    left: STORES_MAP_FLOATING_HEADER_HORIZONTAL_INSET,
    position: 'absolute',
    right: STORES_MAP_FLOATING_HEADER_HORIZONTAL_INSET,
    zIndex: 4,
  },
  backplate: {
    backgroundColor: 'rgba(11, 14, 20, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: STORES_MAP_FLOATING_HEADER_VERTICAL_GAP,
    padding: STORES_MAP_FLOATING_HEADER_BACKPLATE_PADDING,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    height: STORES_MAP_FLOATING_HEADER_TITLE_ROW_HEIGHT,
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginLeft: -6,
    width: 44,
  },
  title: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: STORES_MAP_FLOATING_HEADER_SEARCH_BUTTON_SIZE,
    justifyContent: 'center',
    width: STORES_MAP_FLOATING_HEADER_SEARCH_BUTTON_SIZE,
  },
  editingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    height: STORES_MAP_FLOATING_HEADER_SEARCH_EDIT_ROW_HEIGHT,
  },
  cancelButton: {
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: 2,
  },
  cancelLabel: {
    color: AppColors.blue,
    fontSize: 15,
    fontWeight: '600',
  },
  queryPillMain: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: STORES_MAP_FLOATING_HEADER_TITLE_ROW_HEIGHT,
    paddingHorizontal: 10,
  },
  queryPillText: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  pillClearOuter: {
    alignItems: 'center',
    height: STORES_MAP_FLOATING_HEADER_SEARCH_BUTTON_SIZE,
    justifyContent: 'center',
    width: STORES_MAP_FLOATING_HEADER_SEARCH_BUTTON_SIZE,
  },
  scopeWrap: {
    height: STORES_MAP_FLOATING_HEADER_SCOPE_HEIGHT,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
