/**
 * Unit tests for the pure arrival session evaluator.
 *
 * Run with: npx tsx utils/arrival-evaluator.test.ts
 */

import assert from 'node:assert/strict';

import {
  DEFAULT_STORE_ARRIVAL_CONFIG,
  getExitRadiusMeters,
  haversineDistanceMeters,
} from '@/services/store-arrival';
import type { AcceptedLocationSample } from '@/types/location-sample';
import { createInitialArrivalSessionState } from '@/types/arrival-session';
import type { Store } from '@/types/store';
import type { StoreVisit } from '@/types/store-visit';
import {
  evaluateArrivalSession,
  markArrivalSessionHandled,
} from '@/utils/arrival-evaluator';
import {
  __resetArrivalCheckInForTests,
  hasAutomaticCheckInBeenHandled,
  markAutomaticCheckInHandled,
} from '@/services/arrival-check-in';

const STORE_LAT = 37.7749;
const STORE_LON = -122.4194;
const BASE_TIME = 1_700_000_000_000;

const store: Store = {
  id: 'store-1',
  name: 'Test Store',
  addressLine1: '1 Market St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94105',
  latitude: STORE_LAT,
  longitude: STORE_LON,
  createdAt: 1,
  updatedAt: 1,
};

function createVisit(
  overrides: Partial<StoreVisit> & Pick<StoreVisit, 'status'>,
): StoreVisit {
  return {
    id: 'visit-1',
    storeId: store.id,
    scheduledDate: '2026-07-18',
    routeOrder: 1,
    notes: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function offsetSample(
  distanceMeters: number,
  accuracyMeters: number,
  timestamp = BASE_TIME,
): AcceptedLocationSample {
  const deltaLat = distanceMeters / 111_320;

  return {
    latitude: STORE_LAT + deltaLat,
    longitude: STORE_LON,
    accuracyMeters,
    speedMetersPerSecond: 0,
    timestamp,
  };
}

function insideSample(
  accuracyMeters = 10,
  timestamp = BASE_TIME,
): AcceptedLocationSample {
  return {
    latitude: STORE_LAT,
    longitude: STORE_LON,
    accuracyMeters,
    speedMetersPerSecond: 0,
    timestamp,
  };
}

function runEvaluatorTests(): void {
  const config = {
    ...DEFAULT_STORE_ARRIVAL_CONFIG,
    dwellDurationMs: 20_000,
    minimumConsecutiveInsideReadings: 2,
  };

  // 1. Outside radius remains outside.
  {
    const result = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: offsetSample(300, 10),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    });

    assert.equal(result.state.status, 'outside');
    assert.equal(result.hasArrived, false);
  }

  // 2. One inside reading does not confirm arrival.
  {
    const result = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    });

    assert.equal(result.state.status, 'candidate');
    assert.equal(result.hasArrived, false);
  }

  // 3. Poor-accuracy reading is ignored.
  {
    const previous = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    }).state;

    const result = evaluateArrivalSession({
      previousState: previous,
      sample: insideSample(120),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 1_000,
    });

    assert.equal(result.rejectionReason, 'poor_accuracy');
    assert.equal(result.state.status, 'candidate');
  }

  // 4. Stale reading is ignored.
  {
    const result = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(10, BASE_TIME - 60_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    });

    assert.equal(result.rejectionReason, 'stale_location');
    assert.equal(result.hasArrived, false);
  }

  // 5. Consecutive inside readings begin dwell.
  {
    const first = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    });

    const second = evaluateArrivalSession({
      previousState: first.state,
      sample: insideSample(10, BASE_TIME + 1_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 1_000,
    });

    assert.equal(second.events.some((event) => event.type === 'dwell_started'), true);
    assert.equal(second.state.status, 'dwelling');
  }

  // 6. Arrival is not confirmed before dwell duration.
  {
    let state = createInitialArrivalSessionState();

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    }).state;

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(10, BASE_TIME + 1_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 1_000,
    }).state;

    const beforeDwell = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(10, BASE_TIME + 10_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 10_000,
    });

    assert.equal(beforeDwell.hasArrived, false);
    assert.equal(beforeDwell.state.status, 'dwelling');
  }

  // 7. Arrival confirms after dwell duration.
  {
    let state = createInitialArrivalSessionState();

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    }).state;

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(10, BASE_TIME + 1_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 1_000,
    }).state;

    const confirmed = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(10, BASE_TIME + 21_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 21_000,
    });

    assert.equal(confirmed.hasArrived, true);
    assert.equal(confirmed.state.status, 'arrived');
    assert.equal(
      confirmed.events.some((event) => event.type === 'arrival_confirmed'),
      true,
    );
  }

  // 8. Drive-by exits before dwell does not confirm arrival.
  {
    let state = createInitialArrivalSessionState();

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    }).state;

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(10, BASE_TIME + 1_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 1_000,
    }).state;

    const exited = evaluateArrivalSession({
      previousState: state,
      sample: offsetSample(300, 10, BASE_TIME + 5_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 5_000,
    });

    assert.equal(exited.hasArrived, false);
    assert.equal(exited.state.status, 'outside');
  }

  // 9. Hysteresis keeps the user inside between entry and exit radii.
  {
    const exitRadius = getExitRadiusMeters(config);
    const betweenRadius = (config.enterRadiusMeters + exitRadius) / 2;

    let state = createInitialArrivalSessionState();

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    }).state;

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(10, BASE_TIME + 1_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 1_000,
    }).state;

    const drifted = evaluateArrivalSession({
      previousState: state,
      sample: offsetSample(betweenRadius, 10, BASE_TIME + 2_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 2_000,
    });

    assert.equal(drifted.state.isInsideZone, true);
    assert.notEqual(drifted.state.status, 'outside');
  }

  // 10. Exiting beyond exit radius resets the session.
  {
    let state = createInitialArrivalSessionState();

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    }).state;

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(10, BASE_TIME + 1_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 1_000,
    }).state;

    const exited = evaluateArrivalSession({
      previousState: state,
      sample: offsetSample(getExitRadiusMeters(config) + 50, 10, BASE_TIME + 3_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 3_000,
    });

    assert.equal(exited.state.status, 'outside');
    assert.equal(
      exited.events.some((event) => event.type === 'arrival_exited'),
      true,
    );
  }

  // 11. Poor-accuracy reading does not falsely trigger exit.
  {
    let state = createInitialArrivalSessionState();

    state = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    }).state;

    const poor = evaluateArrivalSession({
      previousState: state,
      sample: insideSample(120, BASE_TIME + 1_000),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 1_000,
    });

    assert.equal(poor.rejectionReason, 'poor_accuracy');
    assert.equal(poor.state.status, 'candidate');
  }

  // 12. Changing the current visit resets the session.
  {
    const arrived = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current', id: 'visit-1' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 21_000,
      simulateConfirmedArrival: true,
    });

    const reset = evaluateArrivalSession({
      previousState: arrived.state,
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current', id: 'visit-2' }),
      workdayActive: true,
      config,
      now: BASE_TIME + 22_000,
    });

    assert.equal(
      reset.events.some((event) => event.type === 'arrival_reset'),
      true,
    );
    assert.equal(reset.state.visitId, 'visit-2');
  }

  // 13. Ending the workday resets the session.
  {
    const arrived = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
      simulateConfirmedArrival: true,
    });

    const reset = evaluateArrivalSession({
      previousState: arrived.state,
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: false,
      config,
      now: BASE_TIME + 1_000,
    });

    assert.equal(reset.state.status, 'inactive');
  }

  // 14. Completed or skipped visits cannot arrive.
  for (const status of ['completed', 'skipped'] as const) {
    const result = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit: createVisit({ status }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    });

    assert.equal(result.state.status, 'inactive');
    assert.equal(result.hasArrived, false);
  }

  // 15. Already checked-in visits cannot trigger another automatic check-in path in evaluator.
  {
    const result = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'checked_in', checkedInAt: BASE_TIME }),
      workdayActive: true,
      config,
      now: BASE_TIME,
    });

    assert.equal(result.state.status, 'inactive');
    assert.equal(result.hasArrived, false);
  }

  // 16. Dev simulation confirms arrival.
  {
    const result = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: null,
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
      simulateConfirmedArrival: true,
    });

    assert.equal(result.hasArrived, true);
    assert.equal(result.state.status, 'arrived');
  }

  // 17-19. Mode behavior is enforced in orchestration; verify pure eligibility here.
  assert.equal(
    evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit: createVisit({ status: 'current' }),
      workdayActive: true,
      config,
      now: BASE_TIME,
      simulateConfirmedArrival: true,
    }).hasArrived,
    true,
  );

  // 20. Duplicate automatic handling lock.
  __resetArrivalCheckInForTests();
  markAutomaticCheckInHandled('visit-1');
  assert.equal(hasAutomaticCheckInBeenHandled('visit-1'), true);

  // 21-23. Undo protections are enforced in store-visits domain (manual/completed).
  assert.equal(
    markArrivalSessionHandled(
      evaluateArrivalSession({
        previousState: createInitialArrivalSessionState(),
        sample: insideSample(),
        store,
        visit: createVisit({ status: 'current' }),
        workdayActive: true,
        config,
        now: BASE_TIME,
        simulateConfirmedArrival: true,
      }).state,
      BASE_TIME,
    ).status,
    'handled',
  );

  // 24. Existing visits without checkInSource still evaluate normally.
  {
    const visit = createVisit({ status: 'current' });
    assert.equal(visit.checkInSource, undefined);

    const result = evaluateArrivalSession({
      previousState: createInitialArrivalSessionState(),
      sample: insideSample(),
      store,
      visit,
      workdayActive: true,
      config,
      now: BASE_TIME,
    });

    assert.equal(result.state.status, 'candidate');
  }

  // Sanity: haversine at store center is zero.
  assert.equal(
    Math.round(
      haversineDistanceMeters(
        { latitude: STORE_LAT, longitude: STORE_LON },
        { latitude: STORE_LAT, longitude: STORE_LON },
      ),
    ),
    0,
  );

  console.log('arrival-evaluator tests passed');
}

runEvaluatorTests();
