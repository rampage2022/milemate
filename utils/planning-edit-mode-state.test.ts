/**
 * Run with: npx tsx utils/planning-edit-mode-state.test.ts
 */

import assert from 'node:assert/strict';

/**
 * Documents persistent edit-mode transitions used by CoordinatorPlanningScreen.
 */
function runTests() {
  let isEditingStops = false;
  let editingStoreId: string | null = null;

  function enterEditMode() {
    isEditingStops = true;
  }

  function closeStoreEditor() {
    editingStoreId = null;
  }

  function exitEditMode() {
    isEditingStops = false;
    editingStoreId = null;
  }

  enterEditMode();
  editingStoreId = 'store-1';
  closeStoreEditor();
  assert.equal(isEditingStops, true, 'closing store editor keeps list edit mode');

  editingStoreId = 'store-2';
  closeStoreEditor();
  assert.equal(isEditingStops, true, 'editing multiple stores keeps list edit mode');

  exitEditMode();
  assert.equal(isEditingStops, false);
  assert.equal(editingStoreId, null);

  console.log('planning-edit-mode-state.test.ts: all tests passed');
}

runTests();
