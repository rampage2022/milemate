# Workday Coordinator

The Workday Coordinator is the single source of truth for the active workday's temporary state. UI surfaces may read and display this state, but they should not independently invent conflicting versions of the current workday phase.

## Location

`core/workdayCoordinator.ts`

## Scope

The coordinator holds **live, in-memory** workday context only:

- Current phase (`idle`, `ready`, `driving`, `arrived`, `checkedIn`, `completingVisit`, `advancing`, `finished`)
- Active workday id
- Current store identity and stop index
- Stop progress counts
- Tracked miles (value supplied by callers — not calculated here)
- Visit start timestamp (ISO string)

## Non-goals (first version)

- No Live Activities
- No persistence
- No GPS or mileage calculation
- No navigation, notifications, haptics, or UI side effects
- No timers or intervals

## Adoption

Existing tracking, visit, and Today flows continue to use their current modules. Future surfaces (Live Activities, notifications, Apple Watch) should subscribe via `subscribe()` or read via `getState()` rather than duplicating phase logic.

Integration with existing hooks and screens is intentionally deferred.

The removed `workday-state-store` layer was deleted during audit — it duplicated coordinator responsibilities without consumers.

## Subscription

`subscribe(listener)` invokes the listener **immediately** with the latest state, then on every mutation. It returns an unsubscribe function.

## Validation

- `trackedMiles` cannot be negative
- `completedStopCount` and `totalStopCount` cannot be negative
- `completedStopCount` cannot exceed `totalStopCount`
