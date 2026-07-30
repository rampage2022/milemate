import { useLocalSearchParams } from 'expo-router';

import { StoreOverviewScreen } from '@/components/store/store-overview-screen';

export default function StoreDetailScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  if (typeof storeId !== 'string') {
    return null;
  }

  return <StoreOverviewScreen storeId={storeId} />;
}
