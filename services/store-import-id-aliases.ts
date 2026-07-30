import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_IMPORT_ID_ALIASES_KEY = '@milemate/store-import-id-aliases';

export type StoreImportIdAlias = {
  createdAt: string;
  fromStoreId: string;
  reason: 'import_create_duplicate';
  toStoreId: string;
};

async function readAliases(): Promise<StoreImportIdAlias[]> {
  const stored = await AsyncStorage.getItem(STORE_IMPORT_ID_ALIASES_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is StoreImportIdAlias => {
      if (typeof entry !== 'object' || entry === null) {
        return false;
      }

      const record = entry as Record<string, unknown>;

      return (
        typeof record.fromStoreId === 'string' &&
        typeof record.toStoreId === 'string' &&
        typeof record.createdAt === 'string' &&
        record.reason === 'import_create_duplicate'
      );
    });
  } catch {
    return [];
  }
}

async function writeAliases(aliases: StoreImportIdAlias[]): Promise<void> {
  await AsyncStorage.setItem(STORE_IMPORT_ID_ALIASES_KEY, JSON.stringify(aliases));
}

export async function appendStoreImportIdAlias(input: {
  fromStoreId: string;
  toStoreId: string;
}): Promise<void> {
  if (input.fromStoreId === input.toStoreId) {
    return;
  }

  const aliases = await readAliases();
  const exists = aliases.some(
    (alias) =>
      alias.fromStoreId === input.fromStoreId && alias.toStoreId === input.toStoreId,
  );

  if (exists) {
    return;
  }

  await writeAliases([
    ...aliases,
    {
      createdAt: new Date().toISOString(),
      fromStoreId: input.fromStoreId,
      reason: 'import_create_duplicate',
      toStoreId: input.toStoreId,
    },
  ]);
}

export async function getStoreImportIdRemap(): Promise<Map<string, string>> {
  const aliases = await readAliases();
  const remap = new Map<string, string>();

  for (const alias of aliases) {
    remap.set(alias.fromStoreId, alias.toStoreId);
  }

  return remap;
}

export { STORE_IMPORT_ID_ALIASES_KEY };
