import type { Store } from '@/types/store';

export type StoreImportField =
  | 'storeNumber'
  | 'storeName'
  | 'address'
  | 'fullAddress'
  | 'city'
  | 'state'
  | 'zip'
  | 'manager'
  | 'phone'
  | 'latitude'
  | 'longitude'
  | 'ignore';

export type MappingConfidence = 'high' | 'medium' | 'low' | 'unmapped';

export type ParsedStoreCsv = {
  headers: string[];
  rows: Record<string, string>[];
  rowNumbers: number[];
  errors: string[];
};

export type ColumnMappingSuggestion = {
  sourceColumn: string;
  suggestedField: StoreImportField;
  confidence: MappingConfidence;
  score: number;
  sampleValues: string[];
};

export type StoreImportMapping = Record<string, StoreImportField>;

export type ImportRowValidationStatus = 'valid' | 'warning' | 'invalid';

export type ResolvedImportRow = {
  rowNumber: number;
  storeNumber?: string;
  storeName?: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  fullAddressText?: string;
  managerName?: string;
  managerPhone?: string;
  latitude?: number;
  longitude?: number;
  validationStatus: ImportRowValidationStatus;
  messages: string[];
  displayTitle: string;
  formattedAddress: string;
};

export type ImportPreviewOutcome =
  | 'create'
  | 'update'
  | 'warning'
  | 'possible_duplicate'
  | 'duplicate_in_file'
  | 'error'
  | 'skip';

export type DuplicateMatchReason = 'storeNumber' | 'fullAddress' | 'addressComponents';

export type DuplicateMatch = {
  confidence: 'confident' | 'possible';
  existingStore: Store;
  reason: DuplicateMatchReason;
};

export type DuplicateDecision = 'update' | 'create' | 'skip';

export type ImportPreviewRow = {
  rowNumber: number;
  resolved: ResolvedImportRow;
  outcome: ImportPreviewOutcome;
  duplicateMatch?: DuplicateMatch;
  duplicateDecision?: DuplicateDecision;
  existingStoreId?: string;
};

export type ImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  newStores: number;
  updates: number;
  possibleDuplicates: number;
  skipped: number;
  errors: number;
};

export type ImportExecutionResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  warnings: number;
};

export const STORE_IMPORT_FIELD_LABELS: Record<StoreImportField, string> = {
  storeNumber: 'Store Number',
  storeName: 'Store Name',
  address: 'Street Address',
  fullAddress: 'Full Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP Code',
  manager: 'Manager',
  phone: 'Phone',
  latitude: 'Latitude',
  longitude: 'Longitude',
  ignore: 'Ignore',
};

export const MAPPABLE_STORE_IMPORT_FIELDS: StoreImportField[] = [
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
  'ignore',
];

export const SAMPLE_CSV_TEMPLATE = `storeNumber,storeName,address,city,state,zip,manager,phone,latitude,longitude
00156,Target,123 Main St,Fort Worth,TX,76102,Jane Doe,817-555-0100,32.7555,-97.3308
,Westside Grocery,456 Oak Avenue,Arlington,TX,76010,,817-555-0200,,
6548,Kroger,789 Elm Blvd,Dallas,TX,75201,,,,
`;

export const SAMPLE_FULL_ADDRESS_CSV_TEMPLATE = `storeNumber,storeName,fullAddress,manager,phone,latitude,longitude
2201,Fresh Mart,"789 Pine Road, Plano, TX 75024",Sam Lee,972-555-0300,33.0198,-96.6989
,"Corner Store","100 Commerce St, Irving, TX 75039",,,
`;
