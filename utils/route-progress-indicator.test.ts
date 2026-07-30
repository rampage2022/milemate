import assert from 'node:assert/strict';

import {
  ROUTE_PROGRESS_SEGMENT_THRESHOLD,
  resolveRouteProgressSegmentState,
} from '@/utils/route-progress-indicator';
import { buildRouteProgressAccessibilityLabel } from '@/utils/live-route-summary';

function runTests() {
  assert.equal(ROUTE_PROGRESS_SEGMENT_THRESHOLD, 10);

  assert.equal(
    resolveRouteProgressSegmentState({ completedStops: 2, currentStopIndex: 2, index: 0 }),
    'completed',
  );
  assert.equal(
    resolveRouteProgressSegmentState({ completedStops: 2, currentStopIndex: 2, index: 1 }),
    'completed',
  );
  assert.equal(
    resolveRouteProgressSegmentState({ completedStops: 2, currentStopIndex: 2, index: 2 }),
    'current',
  );
  assert.equal(
    resolveRouteProgressSegmentState({ completedStops: 2, currentStopIndex: 2, index: 3 }),
    'upcoming',
  );

  assert.equal(
    resolveRouteProgressSegmentState({ completedStops: 0, currentStopIndex: 0, index: 0 }),
    'current',
  );
  assert.equal(
    resolveRouteProgressSegmentState({ completedStops: 0, currentStopIndex: 0, index: 1 }),
    'upcoming',
  );

  assert.equal(
    resolveRouteProgressSegmentState({ completedStops: 6, currentStopIndex: null, index: 0 }),
    'completed',
  );
  assert.equal(
    resolveRouteProgressSegmentState({ completedStops: 6, currentStopIndex: null, index: 5 }),
    'completed',
  );

  assert.equal(
    buildRouteProgressAccessibilityLabel({
      completedStops: 2,
      currentPosition: 3,
      currentStopIndex: 2,
      totalStops: 6,
    }),
    'Route progress, 3 of 6 stops, 2 completed, stop 3 current.',
  );

  assert.equal(
    buildRouteProgressAccessibilityLabel({
      completedStops: 6,
      currentPosition: 6,
      currentStopIndex: null,
      totalStops: 6,
    }),
    'Route progress, 6 of 6 stops, 6 completed.',
  );

  console.log('route-progress-indicator tests passed');
}

runTests();
