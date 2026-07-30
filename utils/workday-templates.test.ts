import assert from 'node:assert/strict';

import { getTodayVisits, replaceTodayVisits, __resetStoreVisitsStorageForTests, __setStoreVisitsStorageForTests } from '@/services/store-visits';
import { saveStores, __resetStoresStorageForTests, __setStoresStorageForTests } from '@/services/stores';
import {
  __resetWorkdayTemplatesStorageForTests,
  __setWorkdayTemplatesStorageForTests,
  applyWorkdayTemplateAddMissing,
  applyWorkdayTemplateReplace,
  createWorkdayTemplate,
  deleteWorkdayTemplate,
  findWorkdayTemplateByName,
  getWorkdayTemplates,
  replaceExistingWorkdayTemplateByName,
  replaceWorkdayTemplateWithCurrentStops,
  saveCurrentStopsAsWorkdayTemplate,
  updateWorkdayTemplate,
} from '@/services/workday-templates';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import { getTodayDateString } from '@/utils/today-date';
import {
  createWorkdayTemplateId,
  createWorkdayTemplateStopId,
  workdayTemplateNamesMatch,
  type WorkdayTemplate,
} from '@/types/workday-template';
import {
  buildWorkdayTemplateStopsFromVisits,
  resolveWorkdayTemplateStop,
  selectMissingWorkdayTemplateStops,
  workdayTemplateStopMatchesVisit,
} from '@/utils/workday-template-utils';

function baseStore(partial: Partial<Store> & Pick<Store, 'id' | 'name' | 'addressLine1' | 'city' | 'state' | 'postalCode'>): Store {
  const now = Date.now();

  return {
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function baseVisit(partial: Partial<StoreVisit> & Pick<StoreVisit, 'id' | 'storeId' | 'routeOrder'>): StoreVisit {
  const now = Date.now();

  return {
    scheduledDate: getTodayDateString(),
    status: 'pending',
    notes: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

async function runTests() {
  __resetWorkdayTemplatesStorageForTests();
  __resetStoresStorageForTests();
  __resetStoreVisitsStorageForTests();
  __setWorkdayTemplatesStorageForTests([]);
  __setStoresStorageForTests([]);
  __setStoreVisitsStorageForTests([]);

  const storeA = baseStore({
    id: 'store-a',
    name: 'Target',
    addressLine1: '123 Main St',
    city: 'Fort Worth',
    state: 'TX',
    postalCode: '76102',
    latitude: 32.7,
    longitude: -97.3,
  });
  const storeB = baseStore({
    id: 'store-b',
    name: '',
    storeNumber: '2201',
    addressLine1: '456 Oak Ave',
    city: 'Arlington',
    state: 'TX',
    postalCode: '76010',
    latitude: 32.6,
    longitude: -97.1,
  });
  const manualStore = baseStore({
    id: 'store-manual',
    name: '',
    addressLine1: '789 Pine Road',
    city: 'Plano',
    state: 'TX',
    postalCode: '75024',
  });

  const visits = [
    baseVisit({ id: 'visit-1', storeId: storeA.id, routeOrder: 1 }),
    baseVisit({ id: 'visit-2', storeId: storeB.id, routeOrder: 2 }),
    baseVisit({ id: 'visit-3', storeId: manualStore.id, routeOrder: 3 }),
  ];
  const storesById = {
    [storeA.id]: storeA,
    [storeB.id]: storeB,
    [manualStore.id]: manualStore,
  };

  const stops = buildWorkdayTemplateStopsFromVisits(visits, storesById);
  assert.equal(stops.length, 3);
  assert.equal(stops[0]?.storeId, 'store-a');
  assert.equal(stops[1]?.storeId, 'store-b');
  assert.equal(stops[2]?.sourceType, 'store');
  assert.equal(stops[0]?.displayName, 'Target');

  await assert.rejects(
    () => createWorkdayTemplate({ name: '   ', stops }),
    /Workday name is required/,
  );
  await assert.rejects(
    () => createWorkdayTemplate({ name: 'Monday', stops: [] }),
    /Add at least one stop/,
  );

  const template = await saveCurrentStopsAsWorkdayTemplate({
    name: 'Monday',
    visits,
    storesById,
  });
  assert.equal(template.name, 'Monday');
  assert.equal(template.stops.length, 3);
  assert.equal(template.stops[0]?.storeId, 'store-a');

  const duplicate = await findWorkdayTemplateByName('monday');
  assert.ok(duplicate);
  assert.ok(workdayTemplateNamesMatch('Monday', ' monday '));

  await saveStores([storeA, storeB, manualStore]);
  await replaceTodayVisits([]);

  const loaded = await applyWorkdayTemplateReplace(template);
  assert.equal(loaded.length, 3);
  assert.deepEqual(loaded.map((visit) => visit.routeOrder), [1, 2, 3]);
  assert.equal(loaded[0]?.status, 'pending');
  assert.equal(loaded[0]?.tripId, undefined);

  const refreshed = resolveWorkdayTemplateStop(template.stops[0]!, storeA);
  assert.equal(refreshed.displayName, 'Target');
  assert.equal(refreshed.address, '123 Main St, Fort Worth, TX 76102');

  const missingStoreStop = {
    id: createWorkdayTemplateStopId(),
    storeId: 'store-missing',
    displayName: 'Old Store',
    address: '100 Commerce St, Irving, TX 75039',
    latitude: 32.8,
    longitude: -96.9,
    sourceType: 'manual' as const,
  };
  const fallback = resolveWorkdayTemplateStop(missingStoreStop, null);
  assert.equal(fallback.displayName, 'Old Store');
  assert.equal(fallback.storeId, 'store-missing');

  await replaceTodayVisits([baseVisit({ id: 'visit-current', storeId: storeA.id, routeOrder: 1 })]);
  const addResult = await applyWorkdayTemplateAddMissing({
    ...template,
    stops: template.stops,
  });
  assert.equal(addResult.addedCount, 2);
  assert.equal(addResult.skippedCount, 1);
  assert.equal(addResult.visits.length, 3);
  assert.equal(addResult.visits[0]?.storeId, storeA.id);

  const currentVisits = [
    baseVisit({ id: 'visit-current', storeId: storeA.id, routeOrder: 1 }),
  ];
  const missingSelection = selectMissingWorkdayTemplateStops(
    template,
    currentVisits,
    storesById,
    storesById,
  );
  assert.equal(missingSelection.appendedStops.length, 2);
  assert.equal(missingSelection.skippedCount, 1);

  assert.ok(
    workdayTemplateStopMatchesVisit(template.stops[0]!, currentVisits[0]!, storeA),
  );
  assert.equal(
    workdayTemplateStopMatchesVisit(
      { ...template.stops[1]!, displayName: 'Target' },
      currentVisits[0]!,
      storeA,
    ),
    false,
  );
  assert.equal(
    workdayTemplateStopMatchesVisit(
      {
        ...template.stops[0]!,
        storeId: undefined,
        displayName: 'Different Label',
      },
      currentVisits[0]!,
      storeA,
    ),
    true,
  );

  await replaceWorkdayTemplateWithCurrentStops({
    templateId: template.id,
    visits: [visits[0]!],
    storesById,
  });
  const updatedTemplate = (await getWorkdayTemplates())[0];
  assert.equal(updatedTemplate?.stops.length, 1);

  await replaceExistingWorkdayTemplateByName({
    name: 'Monday',
    visits,
    storesById,
  });
  const replacedByName = await findWorkdayTemplateByName('Monday');
  assert.equal(replacedByName?.stops.length, 3);

  await updateWorkdayTemplate(template.id, { name: 'Tuesday' });
  assert.ok(await findWorkdayTemplateByName('Tuesday'));

  await deleteWorkdayTemplate(template.id);
  const remaining = await getWorkdayTemplates();
  assert.equal(remaining.some((item) => item.id === template.id), false);

  const seededTemplate: WorkdayTemplate = {
    id: createWorkdayTemplateId(),
    name: 'History Check',
    stops: [template.stops[0]!],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  __setWorkdayTemplatesStorageForTests([seededTemplate]);
  assert.equal((await getWorkdayTemplates()).length, 1);

  const todayAfterLoad = await getTodayVisits();
  assert.ok(todayAfterLoad.every((visit) => visit.tripId === undefined));

  __resetWorkdayTemplatesStorageForTests();
  __resetStoresStorageForTests();
  __resetStoreVisitsStorageForTests();
  console.log('workday-templates tests passed');
}

void runTests();
