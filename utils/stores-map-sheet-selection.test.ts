import assert from 'node:assert/strict';

/**
 * Floating-card policy: marker selection never auto-raises the browse sheet.
 */
function shouldAutoSnapToMediumOnSelection(input: {
  nextSelectedStoreId: string | null;
  previousSelectedStoreId: string | null;
}): boolean {
  return false;
}

function shouldAutoSnapToCollapsedOnClear(input: {
  nextSelectedStoreId: string | null;
  previousSelectedStoreId: string | null;
}): boolean {
  return !input.nextSelectedStoreId && Boolean(input.previousSelectedStoreId);
}

function runTests() {
  assert.equal(
    shouldAutoSnapToMediumOnSelection({
      nextSelectedStoreId: 'a',
      previousSelectedStoreId: null,
    }),
    false,
  );
  assert.equal(
    shouldAutoSnapToMediumOnSelection({
      nextSelectedStoreId: 'a',
      previousSelectedStoreId: 'a',
    }),
    false,
  );
  assert.equal(
    shouldAutoSnapToMediumOnSelection({
      nextSelectedStoreId: 'b',
      previousSelectedStoreId: 'a',
    }),
    false,
  );

  assert.equal(
    shouldAutoSnapToCollapsedOnClear({
      nextSelectedStoreId: null,
      previousSelectedStoreId: 'a',
    }),
    true,
  );
  assert.equal(
    shouldAutoSnapToCollapsedOnClear({
      nextSelectedStoreId: 'a',
      previousSelectedStoreId: 'a',
    }),
    false,
  );

  console.log('stores-map-sheet-selection tests passed');
}

runTests();
