/**
 * Best-effort text extraction from a local image URI (camera roll / photo picker).
 * Requires a dev client build with ML Kit text recognition linked.
 */
export async function extractTextFromImageUri(uri: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default as {
      recognize: (imageUri: string) => Promise<{ text?: string }>;
    };

    const result = await TextRecognition.recognize(uri);
    const text = result.text?.trim();

    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
