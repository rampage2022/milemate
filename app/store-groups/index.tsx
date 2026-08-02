import { Stack } from 'expo-router';

import { StoreGroupsManageScreen } from '@/components/stores/store-groups-manage-screen';

export default function StoreGroupsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Store Groups' }} />
      <StoreGroupsManageScreen />
    </>
  );
}
