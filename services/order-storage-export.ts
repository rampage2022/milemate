import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { buildOrderStorageBackupPayload } from '@/services/order-storage-diagnostic';

export async function exportOrderStorageDiagnosticBackup(): Promise<string> {
  const payload = await buildOrderStorageBackupPayload();
  const fileName = `milemate-order-storage-backup-${Date.now()}.json`;
  const file = new File(Paths.cache, fileName);

  file.create({ overwrite: true });
  file.write(JSON.stringify(payload, null, 2));

  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    return file.uri;
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Export MileMate order storage backup',
    mimeType: 'application/json',
    UTI: 'public.json',
  });

  return file.uri;
}
