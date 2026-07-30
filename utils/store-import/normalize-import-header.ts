export function normalizeImportHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-.]+/g, ' ')
    .replace(/[^\w\s#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactImportHeader(header: string): string {
  return normalizeImportHeader(header).replace(/\s+/g, '');
}

export function headersMatch(a: string, b: string): boolean {
  const normalizedA = normalizeImportHeader(a);
  const normalizedB = normalizeImportHeader(b);

  if (normalizedA === normalizedB) {
    return true;
  }

  return compactImportHeader(a) === compactImportHeader(b);
}
