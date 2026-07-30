import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/components/shared/app-theme';
import type { SavedRoute } from '@/types/saved-route';

type SavedRoutesSheetProps = {
  onClose: () => void;
  onSelectRoute: (route: SavedRoute) => void;
  routes: SavedRoute[];
  visible: boolean;
};

export function SavedRoutesSheet({
  onClose,
  onSelectRoute,
  routes,
  visible,
}: SavedRoutesSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close saved routes" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Saved Routes</Text>
          <ScrollView contentContainerStyle={styles.content}>
            {routes.length === 0 ? (
              <Text style={styles.empty}>No saved routes yet.</Text>
            ) : (
              routes.map((route) => (
                <Pressable
                  accessibilityLabel={`Load saved route ${route.name}`}
                  accessibilityRole="button"
                  key={route.id}
                  onPress={() => {
                    onSelectRoute(route);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <Text style={styles.routeName}>{route.name}</Text>
                  <Text style={styles.routeMeta}>
                    {route.stops.length === 1 ? '1 stop' : `${route.stops.length} stops`}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
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
    maxHeight: '70%',
    padding: 20,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  content: {
    gap: 10,
    paddingBottom: 24,
  },
  empty: {
    color: AppColors.textSecondary,
    fontSize: 15,
  },
  row: {
    gap: 2,
    paddingVertical: 12,
  },
  routeName: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  routeMeta: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
  },
});
