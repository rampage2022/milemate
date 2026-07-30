import Papa from 'papaparse';

import type { ParsedStoreCsv } from '@/types/store-import';

function preserveCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

export function parseStoreCsv(content: string): ParsedStoreCsv {
  const trimmed = content.replace(/^\uFEFF/, '');

  if (trimmed.trim().length === 0) {
    return {
      headers: [],
      rows: [],
      rowNumbers: [],
      errors: ['CSV file is empty.'],
    };
  }

  const parsed = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: preserveCellValue,
  });

  const errors = [...parsed.errors.map((error) => error.message)];

  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    return {
      headers: [],
      rows: [],
      rowNumbers: [],
      errors: errors.length > 0 ? errors : ['CSV file has no header row.'],
    };
  }

  const headers = parsed.meta.fields.filter((header) => header.length > 0);

  if (headers.length === 0) {
    return {
      headers: [],
      rows: [],
      rowNumbers: [],
      errors: ['CSV file has no usable column headers.'],
    };
  }

  const rows: Record<string, string>[] = [];
  const rowNumbers: number[] = [];

  parsed.data.forEach((row, index) => {
    const hasValues = headers.some((header) => preserveCellValue(row[header]).trim().length > 0);

    if (!hasValues) {
      return;
    }

    const normalizedRow: Record<string, string> = {};

    headers.forEach((header) => {
      normalizedRow[header] = preserveCellValue(row[header]);
    });

    rows.push(normalizedRow);
    rowNumbers.push(index + 2);
  });

  return {
    headers,
    rows,
    rowNumbers,
    errors,
  };
}

export function isAcceptedCsvFile(input: {
  name?: string | null;
  mimeType?: string | null;
}): { accepted: boolean; reason?: string } {
  const fileName = input.name?.toLowerCase() ?? '';
  const mimeType = input.mimeType?.toLowerCase() ?? '';

  const csvExtension = fileName.endsWith('.csv');
  const csvMime =
    mimeType === 'text/csv' ||
    mimeType === 'application/csv' ||
    mimeType === 'text/comma-separated-values' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
    return {
      accepted: false,
      reason: 'Unsupported file type. Please choose a CSV file.',
    };
  }

  if (csvExtension) {
    return { accepted: true };
  }

  if (csvMime) {
    return { accepted: true };
  }

  if (mimeType === 'text/plain' && csvExtension) {
    return { accepted: true };
  }

  if (mimeType === 'application/octet-stream' && csvExtension) {
    return { accepted: true };
  }

  return {
    accepted: false,
    reason: 'Unsupported file type. CSV files only (.csv).',
  };
}
