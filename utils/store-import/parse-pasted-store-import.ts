import type { ParsedStoreCsv } from '@/types/store-import';

import { parseStoreCsv } from '@/utils/store-import/parse-store-csv';

const FULL_ADDRESS_HEADER = 'fullAddress';

function looksLikeCsvTable(content: string): boolean {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return false;
  }

  const firstLine = lines[0]!;
  const commaCount = (firstLine.match(/,/g) ?? []).length;

  if (commaCount === 0) {
    return false;
  }

  if (/\b(store|address|city|state|zip|name|number|full)\b/i.test(firstLine)) {
    return true;
  }

  const firstCell = firstLine.split(',')[0]?.trim() ?? '';

  if (/^\d/.test(firstCell)) {
    return false;
  }

  if (lines.length === 1) {
    return commaCount >= 2;
  }

  return commaCount >= 1;
}

/** Parse pasted CSV text or one address per line into import rows. */
export function parsePastedStoreImportText(content: string): ParsedStoreCsv {
  const trimmed = content.replace(/^\uFEFF/, '').trim();

  if (trimmed.length === 0) {
    return {
      headers: [],
      rows: [],
      rowNumbers: [],
      errors: ['Paste at least one address or CSV row.'],
    };
  }

  if (looksLikeCsvTable(trimmed)) {
    return parseStoreCsv(trimmed);
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines.map((line) => ({
    [FULL_ADDRESS_HEADER]: line,
  }));

  return {
    headers: [FULL_ADDRESS_HEADER],
    rows,
    rowNumbers: lines.map((_line, index) => index + 1),
    errors: [],
  };
}

/** Turn OCR / photo text into import rows (one address per non-empty line). */
export function parseRecognizedAddressText(content: string): ParsedStoreCsv {
  return parsePastedStoreImportText(content);
}
