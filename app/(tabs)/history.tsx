import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { getTrips } from '@/services/trips';
import { isCompletedTrip, type Trip } from '@/types/trip';

function formatWorkdayDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function WorkdayRow({
  workday,
  onPress,
}: {
  workday: Trip;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.rowDate}>{formatWorkdayDate(workday.startedAt)}</Text>
      <Text style={styles.rowMiles}>{workday.distanceMiles.toFixed(2)} mi</Text>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [workdays, setWorkdays] = useState<Trip[]>([]);

  const loadWorkdays = useCallback(async () => {
    const trips = await getTrips();
    setWorkdays(trips.filter(isCompletedTrip));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWorkdays();
    }, [loadWorkdays]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Past Workdays</Text>

      <FlatList
        data={workdays}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          workdays.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No workdays recorded yet</Text>
        }
        renderItem={({ item }) => (
          <WorkdayRow
            workday={item}
            onPress={() => {
              router.push({
                pathname: '/diagnostics',
                params: { tripId: item.id },
              });
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
  },
  row: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowDate: {
    fontSize: 16,
    flex: 1,
  },
  rowMiles: {
    fontSize: 16,
    fontWeight: '700',
  },
});
