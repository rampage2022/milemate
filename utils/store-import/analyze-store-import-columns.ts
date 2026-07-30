import type {
  ColumnMappingSuggestion,
  MappingConfidence,
  StoreImportField,
  StoreImportMapping,
} from '@/types/store-import';
import {
  compactImportHeader,
  headersMatch,
  normalizeImportHeader,
} from '@/utils/store-import/normalize-import-header';
import {
  collectColumnSamples,
  looksLikeFullAddress,
  looksLikeLatitude,
  looksLikeLongitude,
  looksLikePersonName,
  looksLikePhone,
  looksLikeState,
  looksLikeStoreName,
  looksLikeStoreNumber,
  looksLikeStreetAddress,
  looksLikeZip,
  ratioMatching,
  uniquenessRatio,
} from '@/utils/store-import/value-analysis';

const FIELD_ALIASES: Record<Exclude<StoreImportField, 'ignore'>, string[]> = {
  storeNumber: [
    'store number',
    'store no',
    'store num',
    'store id',
    'location number',
    'location id',
    'account number',
    'account id',
    'customer number',
    'customer id',
    'site number',
    'site id',
    'store #',
    'number',
    'location code',
    'account code',
    'storenumber',
    'storeno',
    'storenum',
    'storeid',
    'locationnumber',
    'locationid',
  ],
  storeName: [
    'store name',
    'location name',
    'account name',
    'customer name',
    'business name',
    'site name',
    'retailer',
    'banner',
    'name',
    'storename',
    'locationname',
    'accountname',
    'customername',
    'businessname',
    'sitename',
  ],
  address: [
    'address',
    'street',
    'street address',
    'address 1',
    'address line 1',
    'location address',
    'store address',
    'physical address',
    'address1',
    'addressline1',
    'streetaddress',
  ],
  fullAddress: [
    'full address',
    'complete address',
    'formatted address',
    'mailing address',
    'location',
    'store location',
    'fulladdress',
    'completeaddress',
    'formattedaddress',
    'mailingaddress',
    'storelocation',
  ],
  city: ['city', 'town', 'municipality'],
  state: ['state', 'province', 'region', 'state code', 'statecode'],
  zip: ['zip', 'zip code', 'zipcode', 'postal', 'postal code', 'postalcode'],
  manager: ['manager', 'manager name', 'store manager', 'contact', 'contact name', 'managername', 'storemanager', 'contactname'],
  phone: ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'contact phone', 'phonenumber', 'contactphone'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon', 'long'],
};

function scoreToConfidence(score: number): MappingConfidence {
  if (score >= 85) {
    return 'high';
  }

  if (score >= 60) {
    return 'medium';
  }

  if (score >= 35) {
    return 'low';
  }

  return 'unmapped';
}

function headerAliasScore(
  header: string,
  field: Exclude<StoreImportField, 'ignore'>,
): number {
  const normalized = normalizeImportHeader(header);
  const compact = compactImportHeader(header);
  const aliases = FIELD_ALIASES[field];

  for (const alias of aliases) {
    if (headersMatch(header, alias)) {
      return field === 'fullAddress' && compact === 'fulladdress' ? 98 : 95;
    }

    const compactAlias = alias.replace(/\s+/g, '');

    if (compact === compactAlias || normalized === alias) {
      return 95;
    }
  }

  for (const alias of aliases) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return 72;
    }
  }

  if (field === 'storeNumber' && (normalized.includes('number') || normalized.includes('#'))) {
    return 55;
  }

  if (field === 'storeName' && normalized.includes('name') && !normalized.includes('manager')) {
    return 50;
  }

  return 0;
}

function valuePatternScore(
  field: Exclude<StoreImportField, 'ignore'>,
  samples: string[],
): number {
  if (samples.length === 0) {
    return 0;
  }

  switch (field) {
    case 'zip':
      return Math.round(ratioMatching(samples, looksLikeZip) * 40);
    case 'state':
      return Math.round(ratioMatching(samples, looksLikeState) * 40);
    case 'phone':
      return Math.round(ratioMatching(samples, looksLikePhone) * 40);
    case 'latitude':
      return Math.round(ratioMatching(samples, looksLikeLatitude) * 40);
    case 'longitude':
      return Math.round(ratioMatching(samples, looksLikeLongitude) * 40);
    case 'address':
      return Math.round(ratioMatching(samples, looksLikeStreetAddress) * 35);
    case 'fullAddress':
      return Math.round(ratioMatching(samples, looksLikeFullAddress) * 40);
    case 'storeNumber': {
      const patternScore = ratioMatching(samples, looksLikeStoreNumber);
      const uniqueScore = uniquenessRatio(samples);

      if (patternScore < 0.6) {
        return 0;
      }

      return Math.round(patternScore * 25 + uniqueScore * 15);
    }
    case 'storeName':
      return Math.round(ratioMatching(samples, looksLikeStoreName) * 30);
    case 'manager':
      return Math.round(ratioMatching(samples, looksLikePersonName) * 20);
    case 'city':
      return Math.round(
        ratioMatching(
          samples,
          (value) =>
            value.length >= 2 &&
            !looksLikeZip(value) &&
            !looksLikeState(value) &&
            !looksLikePhone(value) &&
            !looksLikeStreetAddress(value),
        ) * 20,
      );
    default:
      return 0;
  }
}

export function scoreColumnForField(
  header: string,
  field: Exclude<StoreImportField, 'ignore'>,
  samples: string[],
): number {
  const headerScore = headerAliasScore(header, field);
  const valueScore = valuePatternScore(field, samples);

  if (field === 'manager' && headerScore === 0) {
    return Math.min(valueScore, 25);
  }

  if (field === 'storeNumber' && headerScore === 0 && valueScore > 0) {
    return Math.min(valueScore, 45);
  }

  return Math.min(100, headerScore + valueScore);
}

type ScoredPair = {
  column: string;
  field: StoreImportField;
  score: number;
};

export function analyzeStoreImportColumns(
  headers: string[],
  rows: Record<string, string>[],
): ColumnMappingSuggestion[] {
  const mappableFields: Exclude<StoreImportField, 'ignore'>[] = [
    'storeNumber',
    'storeName',
    'address',
    'fullAddress',
    'city',
    'state',
    'zip',
    'manager',
    'phone',
    'latitude',
    'longitude',
  ];

  const pairs: ScoredPair[] = [];

  headers.forEach((header) => {
    const samples = collectColumnSamples(rows, header);

    mappableFields.forEach((field) => {
      pairs.push({
        column: header,
        field,
        score: scoreColumnForField(header, field, samples),
      });
    });
  });

  pairs.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    const priority: Partial<Record<StoreImportField, number>> = {
      fullAddress: 0,
      address: 1,
      storeNumber: 2,
      storeName: 3,
      city: 4,
      state: 5,
      zip: 6,
      phone: 7,
      manager: 8,
      latitude: 9,
      longitude: 10,
    };

    return (priority[a.field] ?? 99) - (priority[b.field] ?? 99);
  });

  const assignedColumns = new Set<string>();
  const assignedFields = new Set<StoreImportField>();
  const mappingByColumn = new Map<string, ScoredPair>();

  pairs.forEach((pair) => {
    if (assignedColumns.has(pair.column) || assignedFields.has(pair.field)) {
      return;
    }

    if (pair.score < 35) {
      return;
    }

    assignedColumns.add(pair.column);
    assignedFields.add(pair.field);
    mappingByColumn.set(pair.column, pair);
  });

  return headers.map((header) => {
    const samples = collectColumnSamples(rows, header, 5);
    const assigned = mappingByColumn.get(header);

    if (!assigned) {
      return {
        sourceColumn: header,
        suggestedField: 'ignore' as const,
        confidence: 'unmapped' as const,
        score: 0,
        sampleValues: samples,
      };
    }

    return {
      sourceColumn: header,
      suggestedField: assigned.field,
      confidence: scoreToConfidence(assigned.score),
      score: assigned.score,
      sampleValues: samples,
    };
  });
}

export function buildMappingFromSuggestions(
  suggestions: ColumnMappingSuggestion[],
): StoreImportMapping {
  const mapping: StoreImportMapping = {};

  suggestions.forEach((suggestion) => {
    mapping[suggestion.sourceColumn] = suggestion.suggestedField;
  });

  return mapping;
}

export function getMappingConflicts(mapping: StoreImportMapping): StoreImportField[] {
  const counts = new Map<StoreImportField, number>();

  Object.values(mapping).forEach((field) => {
    if (field === 'ignore') {
      return;
    }

    counts.set(field, (counts.get(field) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([field]) => field);
}

export function hasRequiredLocationMappings(mapping: StoreImportMapping): boolean {
  const fields = new Set(Object.values(mapping));

  if (fields.has('fullAddress')) {
    return true;
  }

  return fields.has('address') && (fields.has('city') || fields.has('state') || fields.has('zip'));
}

export function canAutoContinueToPreview(
  suggestions: ColumnMappingSuggestion[],
  mapping: StoreImportMapping,
): boolean {
  if (!hasRequiredLocationMappings(mapping)) {
    return false;
  }

  if (getMappingConflicts(mapping).length > 0) {
    return false;
  }

  const locationFields: StoreImportField[] = ['fullAddress', 'address', 'city', 'state', 'zip'];
  const mappedLocationFields = locationFields.filter((field) =>
    Object.values(mapping).includes(field),
  );

  const lowConfidenceLocation = suggestions.some(
    (suggestion) =>
      mappedLocationFields.includes(suggestion.suggestedField) &&
      suggestion.confidence === 'low',
  );

  if (lowConfidenceLocation) {
    return false;
  }

  const unmappedRequired = mappedLocationFields.some((field) => {
    const suggestion = suggestions.find((item) => item.suggestedField === field);

    return !suggestion || suggestion.confidence === 'unmapped';
  });

  return !unmappedRequired;
}

export function resolveStoreImportMapping(
  suggestions: ColumnMappingSuggestion[],
  overrides: Partial<StoreImportMapping> = {},
): StoreImportMapping {
  const base = buildMappingFromSuggestions(suggestions);

  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(overrides).filter((entry): entry is [string, StoreImportField] =>
        entry[1] !== undefined,
      ),
    ),
  };
}
