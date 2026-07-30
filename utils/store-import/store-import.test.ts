import assert from 'node:assert/strict';

import {
  applyDuplicateDecisions,
  buildImportPreviewRows,
  importStoresSafelyWithRollback,
  summarizeImportPreview,
  __setImportReverseGeocodeHandlerForTests,
} from '@/services/import-stores';
import {
  __resetStoresStorageForTests,
  __setStoresStorageForTests,
  readStoresForImportTests,
  writeStoresForImportTests,
} from '@/services/stores';
import type { Store } from '@/types/store';
import {
  analyzeStoreImportColumns,
  buildMappingFromSuggestions,
  canAutoContinueToPreview,
  getMappingConflicts,
  resolveStoreImportMapping,
  scoreColumnForField,
} from '@/utils/store-import/analyze-store-import-columns';
import {
  normalizeAddressComponentsForMatching,
  normalizeFullAddressForMatching,
  parseFullAddress,
} from '@/utils/store-import/address-utils';
import { findDuplicateInImportBatch, findPossibleStoreDuplicate } from '@/utils/store-import/find-possible-store-duplicate';
import {
  compactImportHeader,
  headersMatch,
  normalizeImportHeader,
} from '@/utils/store-import/normalize-import-header';
import { isAcceptedCsvFile, parseStoreCsv } from '@/utils/store-import/parse-store-csv';
import { parsePastedStoreImportText } from '@/utils/store-import/parse-pasted-store-import';
import { resolveImportedStoreRow } from '@/utils/store-import/resolve-store-import-mapping';
import {
  looksLikeFullAddress,
  looksLikeLatitude,
  looksLikeLongitude,
  looksLikePhone,
  looksLikeState,
  looksLikeStoreNumber,
  looksLikeStreetAddress,
  looksLikeZip,
} from '@/utils/store-import/value-analysis';
import { getStoreDisplayName } from '@/utils/get-store-display-name';

function baseStore(partial: Partial<Store> & Pick<Store, 'id' | 'addressLine1' | 'city' | 'state' | 'postalCode'>): Store {
  const now = Date.now();

  return {
    name: partial.name ?? '',
    storeNumber: partial.storeNumber,
    addressLine2: partial.addressLine2,
    latitude: partial.latitude,
    longitude: partial.longitude,
    managerName: partial.managerName,
    managerPhone: partial.managerPhone,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

async function runTests() {
  __setImportReverseGeocodeHandlerForTests(async (store) => store);

  const quotedCsv = `storeNumber,storeName,address,city,state,zip
00156,"Target, North",123 Main St,Fort Worth,TX,76102`;

  const parsedQuoted = parseStoreCsv(quotedCsv);
  assert.equal(parsedQuoted.rows[0]?.storeNumber, '00156');
  assert.equal(parsedQuoted.rows[0]?.storeName, 'Target, North');

  const escapedQuotes = `storeName,address,city,state,zip
"Store ""A""",10 Oak St,Springfield,IL,62704`;
  const parsedEscaped = parseStoreCsv(escapedQuotes);
  assert.equal(parsedEscaped.rows[0]?.storeName, 'Store "A"');

  const windowsCsv = 'storeName,address,city,state,zip\r\nTarget,1 Main,Springfield,IL,62704\r\n';
  assert.equal(parseStoreCsv(windowsCsv).rows.length, 1);

  const unixCsv = 'storeName,address,city,state,zip\nTarget,1 Main,Springfield,IL,62704\n';
  assert.equal(parseStoreCsv(unixCsv).rows.length, 1);

  const blankLines = `storeName,address,city,state,zip

Target,1 Main,Springfield,IL,62704

`;
  assert.equal(parseStoreCsv(blankLines).rows.length, 1);

  const utf8Csv = 'storeName,address,city,state,zip\nCaf\u00e9,1 Main,Springfield,IL,62704';
  assert.equal(parseStoreCsv(utf8Csv).rows[0]?.storeName, 'Caf\u00e9');

  const emptyCsv = parseStoreCsv('');
  assert.ok(emptyCsv.errors.length > 0);

  const malformed = parseStoreCsv('single-column-only\nvalue');
  assert.ok(malformed.headers.length >= 1);

  assert.equal(normalizeImportHeader('Store #'), 'store #');
  assert.equal(compactImportHeader('STORE_NUMBER'), 'storenumber');
  assert.ok(headersMatch('Store Number', 'store-number'));

  assert.ok(looksLikeZip('76102'));
  assert.ok(looksLikeState('TX'));
  assert.ok(looksLikePhone('(817) 555-0100'));
  assert.ok(looksLikeLatitude('32.75'));
  assert.ok(looksLikeLongitude('-97.33'));
  assert.ok(looksLikeStreetAddress('123 Main St'));
  assert.ok(looksLikeFullAddress('123 Main St, Fort Worth, TX 76102'));
  assert.ok(looksLikeStoreNumber('00156'));
  assert.equal(looksLikeStoreNumber('76102'), false);

  const aliasHeaders = ['Location ID', 'Customer', 'Location', 'Mgr', 'Tel'];
  const aliasRows = [
    {
      'Location ID': '1564',
      Customer: 'Target',
      Location: '123 Main St, Fort Worth, TX 76102',
      Mgr: 'Jane Doe',
      Tel: '817-555-0100',
    },
  ];
  const aliasSuggestions = analyzeStoreImportColumns(aliasHeaders, aliasRows);
  const aliasMapping = buildMappingFromSuggestions(aliasSuggestions);
  assert.equal(aliasMapping['Location ID'], 'storeNumber');
  assert.equal(aliasMapping.Customer, 'storeName');
  assert.equal(aliasMapping.Location, 'fullAddress');

  const lowConfidence = scoreColumnForField('Notes', 'storeNumber', ['Weekly restock', 'Call first']);
  assert.ok(lowConfidence < 35);

  const conflictMapping = {
    ColA: 'city' as const,
    ColB: 'city' as const,
  };
  assert.deepEqual(getMappingConflicts(conflictMapping), ['city']);

  const canonicalCsv = `storeNumber,storeName,address,city,state,zip,manager,phone,latitude,longitude
00156,Target,123 Main St,Fort Worth,TX,76102,Jane,817-555-0100,32.7,-97.3`;
  const canonicalParsed = parseStoreCsv(canonicalCsv);
  const canonicalSuggestions = analyzeStoreImportColumns(
    canonicalParsed.headers,
    canonicalParsed.rows,
  );
  const canonicalMapping = resolveStoreImportMapping(canonicalSuggestions, {
    manager: 'manager',
  });
  assert.ok(canAutoContinueToPreview(canonicalSuggestions, canonicalMapping));

  const resolved = resolveImportedStoreRow(
    canonicalParsed.rows[0]!,
    2,
    buildMappingFromSuggestions(canonicalSuggestions),
  );
  assert.equal(resolved.validationStatus, 'valid');
  assert.equal(resolved.storeNumber, '00156');

  const noIdentityCsv = `address,city,state,zip
456 Oak Avenue,Arlington,TX,76010`;
  const noIdentityParsed = parseStoreCsv(noIdentityCsv);
  const noIdentitySuggestions = analyzeStoreImportColumns(
    noIdentityParsed.headers,
    noIdentityParsed.rows,
  );
  const noIdentityResolved = resolveImportedStoreRow(
    noIdentityParsed.rows[0]!,
    2,
    buildMappingFromSuggestions(noIdentitySuggestions),
  );
  assert.equal(noIdentityResolved.validationStatus, 'valid');
  assert.equal(noIdentityResolved.storeName, undefined);
  assert.equal(getStoreDisplayName({
    name: '',
    addressLine1: noIdentityResolved.addressLine1,
  }), '456 Oak Avenue');

  const fullOnlyCsv = `fullAddress
"789 Pine Road, Plano, TX 75024"`;
  const fullOnlyParsed = parseStoreCsv(fullOnlyCsv);
  const fullOnlySuggestions = analyzeStoreImportColumns(
    fullOnlyParsed.headers,
    fullOnlyParsed.rows,
  );
  const fullOnlyResolved = resolveImportedStoreRow(
    fullOnlyParsed.rows[0]!,
    2,
    buildMappingFromSuggestions(fullOnlySuggestions),
  );
  assert.equal(fullOnlyResolved.validationStatus, 'valid');
  assert.equal(parseFullAddress('789 Pine Road, Plano, TX 75024')?.city, 'Plano');

  const streetOnlyResolved = resolveImportedStoreRow(
    { address: '123 Main St', city: '', state: '', zip: '' },
    3,
    { address: 'address', city: 'city', state: 'state', zip: 'zip' },
  );
  assert.equal(streetOnlyResolved.validationStatus, 'warning');

  const invalidResolved = resolveImportedStoreRow(
    { note: 'nothing useful' },
    4,
    { note: 'ignore' },
  );
  assert.equal(invalidResolved.validationStatus, 'invalid');

  assert.equal(getStoreDisplayName({ name: 'Target', addressLine1: '1 Main' }), 'Target');
  assert.equal(
    getStoreDisplayName({ name: '', storeNumber: '1564', addressLine1: '1 Main' }),
    'Store 1564',
  );
  assert.equal(getStoreDisplayName({ name: '', addressLine1: '123 Main St' }), '123 Main St');
  assert.equal(getStoreDisplayName({ name: '', addressLine1: '' }), 'Imported Store');

  const existing = baseStore({
    id: 'store-1',
    name: 'Old Name',
    storeNumber: '100',
    addressLine1: '123 Main St',
    city: 'Fort Worth',
    state: 'TX',
    postalCode: '76102',
    managerName: 'Alex',
    managerPhone: '817-555-0000',
  });

  const duplicateByNumber = findPossibleStoreDuplicate(
    resolveImportedStoreRow(
      { storeNumber: '100', address: '999 Elsewhere', city: 'Dallas', state: 'TX', zip: '75201' },
      2,
      {
        storeNumber: 'storeNumber',
        address: 'address',
        city: 'city',
        state: 'state',
        zip: 'zip',
      },
    ),
    [existing],
  );
  assert.equal(duplicateByNumber?.reason, 'storeNumber');
  assert.equal(duplicateByNumber?.confidence, 'confident');

  const duplicateByAddress = findPossibleStoreDuplicate(
    resolveImportedStoreRow(
      { address: '123 Main St', city: 'Fort Worth', state: 'TX', zip: '76102' },
      2,
      { address: 'address', city: 'city', state: 'state', zip: 'zip' },
    ),
    [existing],
  );
  assert.ok(duplicateByAddress);

  const notDuplicateByName = findPossibleStoreDuplicate(
    resolveImportedStoreRow(
      { storeName: 'Old Name', address: '500 Other', city: 'Austin', state: 'TX', zip: '78701' },
      2,
      {
        storeName: 'storeName',
        address: 'address',
        city: 'city',
        state: 'state',
        zip: 'zip',
      },
    ),
    [existing],
  );
  assert.equal(notDuplicateByName, null);

  const firstRow = resolveImportedStoreRow(
    { address: '1 Main', city: 'Austin', state: 'TX', zip: '78701' },
    2,
    { address: 'address', city: 'city', state: 'state', zip: 'zip' },
  );
  const secondRow = resolveImportedStoreRow(
    { address: '1 Main', city: 'Austin', state: 'TX', zip: '78701' },
    3,
    { address: 'address', city: 'city', state: 'state', zip: 'zip' },
  );
  assert.ok(findDuplicateInImportBatch(secondRow, [firstRow]));

  __setStoresStorageForTests([existing]);
  const importCsv = `storeNumber,storeName,address,city,state,zip,manager,phone
100,,123 Main St,Fort Worth,TX,76102,,`;
  const importParsed = parseStoreCsv(importCsv);
  const importSuggestions = analyzeStoreImportColumns(
    importParsed.headers,
    importParsed.rows,
  );
  const importMapping = buildMappingFromSuggestions(importSuggestions);
  const previewRows = buildImportPreviewRows(
    importParsed.rows,
    importParsed.rowNumbers,
    importMapping,
    [existing],
  );
  assert.equal(previewRows[0]?.outcome, 'update');

  const createCsv = `storeNumber,storeName,address,city,state,zip
200,New Store,200 Elm,Dallas,TX,75201`;
  const createParsed = parseStoreCsv(createCsv);
  const createSuggestions = analyzeStoreImportColumns(
    createParsed.headers,
    createParsed.rows,
  );
  const createPreview = buildImportPreviewRows(
    createParsed.rows,
    createParsed.rowNumbers,
    buildMappingFromSuggestions(createSuggestions),
    [existing],
  );
  assert.equal(createPreview[0]?.outcome, 'create');

  const mixedPreview = [...previewRows, ...createPreview, {
    rowNumber: 9,
    resolved: invalidResolved,
    outcome: 'error' as const,
  }];
  const summary = summarizeImportPreview(mixedPreview);
  assert.equal(summary.updates, 1);
  assert.equal(summary.newStores, 1);
  assert.equal(summary.errors, 1);

  const possibleDuplicatePreview = buildImportPreviewRows(
    [
      {
        address: '123 Main Street',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
      },
    ],
    [2],
    { address: 'address', city: 'city', state: 'state', zip: 'zip' },
    [existing],
  );
  assert.equal(possibleDuplicatePreview[0]?.outcome, 'possible_duplicate');

  const resolvedPossible = applyDuplicateDecisions(possibleDuplicatePreview, { 2: 'create' });
  assert.equal(resolvedPossible[0]?.outcome, 'create');

  const importResult = await importStoresSafelyWithRollback(
    createPreview,
    async (stores) => {
      __setStoresStorageForTests(stores);
    },
    async () => {
      const stores = [existing];
      return stores;
    },
  );
  assert.equal(importResult.created, 1);

  __setStoresStorageForTests([
    {
      ...existing,
      managerName: 'Alex',
      managerPhone: '817-555-0000',
    },
  ]);
  const blankManagerUpdatePreview = buildImportPreviewRows(
    importParsed.rows,
    importParsed.rowNumbers,
    importMapping,
    await readStoresForImportTests(),
  );
  await importStoresSafelyWithRollback(
    blankManagerUpdatePreview.filter((row) => row.outcome === 'update'),
    writeStoresForImportTests,
    readStoresForImportTests,
  );
  const updatedStore = (await readStoresForImportTests())[0];
  assert.equal(updatedStore?.managerName, 'Alex');
  assert.equal(updatedStore?.managerPhone, '817-555-0000');

  const manualMapping = resolveStoreImportMapping(canonicalSuggestions, {
    [canonicalParsed.headers[0] ?? '']: 'ignore',
  });
  assert.equal(manualMapping[canonicalParsed.headers[0] ?? ''], 'ignore');

  __setStoresStorageForTests([existing]);
  await assert.rejects(
    () =>
      importStoresSafelyWithRollback(
        createPreview,
        async () => {
          throw new Error('Simulated write failure');
        },
        async () => [existing],
      ),
    /Simulated write failure/,
  );

  const preserved = await (async () => {
    const stores = [existing];
    return stores;
  })();
  assert.equal(preserved.length, 1);

  assert.equal(normalizeFullAddressForMatching('123 Main Street, Fort Worth, TX 76102').includes('main'), true);
  assert.ok(
    normalizeAddressComponentsForMatching({
      addressLine1: '123 Main St',
      city: 'Fort Worth',
      state: 'TX',
      postalCode: '76102',
    }),
  );

  assert.equal(isAcceptedCsvFile({ name: 'stores.csv', mimeType: 'text/csv' }).accepted, true);
  assert.equal(isAcceptedCsvFile({ name: 'stores.csv', mimeType: 'text/plain' }).accepted, true);
  assert.equal(isAcceptedCsvFile({ name: 'stores.txt', mimeType: 'text/plain' }).accepted, false);

  const coordOnlyResolved = resolveImportedStoreRow(
    {
      storeName: 'Imported Pin',
      lat: '32.7555',
      lng: '-97.3308',
    },
    2,
    { storeName: 'storeName', lat: 'ignore', lng: 'ignore' },
  );
  assert.equal(coordOnlyResolved.validationStatus, 'warning');
  assert.equal(coordOnlyResolved.latitude, 32.7555);
  assert.equal(coordOnlyResolved.longitude, -97.3308);
  assert.equal(coordOnlyResolved.addressLine1, '');

  const coordInAddressResolved = resolveImportedStoreRow(
    {
      storeName: 'Legacy Pin',
      address: '32.7555, -97.3308',
    },
    3,
    { storeName: 'storeName', address: 'address' },
  );
  assert.equal(coordInAddressResolved.validationStatus, 'warning');
  assert.equal(coordInAddressResolved.latitude, 32.7555);
  assert.equal(coordInAddressResolved.addressLine1, '');

  const placeholderAddressResolved = resolveImportedStoreRow(
    {
      storeName: 'Bad Row',
      address: 'N/A',
      city: 'TBD',
      lat: '32.7',
      lng: '-97.3',
    },
    4,
    {
      storeName: 'storeName',
      address: 'address',
      city: 'city',
      lat: 'latitude',
      lng: 'longitude',
    },
  );
  assert.equal(placeholderAddressResolved.validationStatus, 'warning');
  assert.equal(placeholderAddressResolved.addressLine1, '');

  __resetStoresStorageForTests();
  __setImportReverseGeocodeHandlerForTests(null);
{
  const pasted = parsePastedStoreImportText(
    '2150 N Josey Ln, Carrollton, TX 75006\n1714 Williams Rd, Irving, TX',
  );
  assert.equal(pasted.headers[0], 'fullAddress');
  assert.equal(pasted.rows.length, 2);
  assert.equal(pasted.rows[0]!.fullAddress, '2150 N Josey Ln, Carrollton, TX 75006');
}

  console.log('store-import tests passed');
}

void runTests();
