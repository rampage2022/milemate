import { useLocalSearchParams } from 'expo-router';

import { StoreDeliveriesScreen } from '@/components/store/store-deliveries-screen';

export default function StoreDeliveriesRoute() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  if (typeof storeId !== 'string') {
    return null;
  }

  return <StoreDeliveriesScreen storeId={storeId} />;
}
