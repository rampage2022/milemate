import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppColors } from '@/components/shared/app-theme';
import { StoresLayout } from '@/components/stores/stores-layout';

type StoresSearchFieldProps = {
  onChangeText: (value: string) => void;
  onClear: () => void;
  value: string;
};

export function StoresSearchField({
  onChangeText,
  onClear,
  value,
}: StoresSearchFieldProps) {
  const showClear = value.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <Ionicons
        accessibilityElementsHidden
        color={AppColors.textMuted}
        importantForAccessibility="no-hide-descendants"
        name="search"
        size={18}
        style={styles.leadingIcon}
      />
      <TextInput
        accessibilityLabel="Search stores"
        accessibilityHint="Search by store name, store number, or address"
        allowFontScaling
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        onChangeText={onChangeText}
        placeholder="Search stores"
        placeholderTextColor={AppColors.textMuted}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {showClear ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClear}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
        >
          <Ionicons color={AppColors.textSecondary} name="close-circle" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderColor: AppColors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: StoresLayout.searchHeight,
    paddingHorizontal: 12,
  },
  leadingIcon: {
    marginRight: 8,
  },
  input: {
    color: AppColors.textPrimary,
    flex: 1,
    fontSize: 16,
    minHeight: StoresLayout.searchHeight,
    paddingVertical: 8,
  },
  clearButton: {
    marginLeft: 4,
    minHeight: 32,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
