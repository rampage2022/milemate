import { Stack } from 'expo-router';

import { StoreImportWizard } from '@/components/store-import/store-import-wizard';

export default function StoreImportScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Import Stores' }} />
      <StoreImportWizard />
    </>
  );
}
