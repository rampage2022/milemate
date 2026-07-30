import type { DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export async function readDocumentPickerAssetAsText(
  asset: DocumentPickerAsset,
): Promise<string> {
  if (Platform.OS === 'web') {
    if (asset.file) {
      return asset.file.text();
    }

    const response = await fetch(asset.uri);

    if (!response.ok) {
      throw new Error('Could not read the selected CSV file.');
    }

    return response.text();
  }

  try {
    const file = new File(asset.uri);

    return await file.text();
  } catch {
    return FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }
}
