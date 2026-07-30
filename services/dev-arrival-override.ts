const DEV_SIMULATE_ARRIVAL_KEY = '@milemate/dev-simulate-arrival';

export async function getDevSimulateArrival(): Promise<boolean> {
  if (!__DEV__) {
    return false;
  }

  const AsyncStorage = (await import('@react-native-async-storage/async-storage'))
    .default;

  return (await AsyncStorage.getItem(DEV_SIMULATE_ARRIVAL_KEY)) === 'true';
}

export async function setDevSimulateArrival(enabled: boolean): Promise<void> {
  if (!__DEV__) {
    return;
  }

  const AsyncStorage = (await import('@react-native-async-storage/async-storage'))
    .default;

  await AsyncStorage.setItem(
    DEV_SIMULATE_ARRIVAL_KEY,
    enabled ? 'true' : 'false',
  );
}
