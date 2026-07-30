# MileMate UI redesign — implementation plan

**Last updated:** July 29, 2026

## Product terminology

| Term | Meaning |
|------|---------|
| **New Workday** | Top-level user action on Home idle. Starts today's workday planning flow. Never use **New Route** in user-facing copy. |
| **Route** | Stops and path built **inside** an active or planned workday. |
| **Build Your Route** | Planning screen title while arranging stops before **Set Route**. |

---

## Migration status legend

| Status | Meaning |
|--------|---------|
| **Shell only** | Inherits Phase 1–2 dark tokens, tab bar, stack backgrounds, and spacing helpers. Screen layout and components are still the pre-mockup structure. |
| **Partial (Phase N)** | Phase N work started on this surface; not the full approved mockup or not yet verified on device/simulator. **Do not treat as complete.** |
| **Redesigned (Phase N)** | Phase N mockup-aligned UI pass done **and verified** on device/simulator. |
| **Legacy (Phase N)** | Not yet restyled; scheduled for Phase N (or later). Expected to look pre-redesign until that phase ships. |
| **Implemented (native)** | Native module or platform integration present; requires dev-client rebuild to exercise. |

**Completion rule:** Do not claim visual parity or phase completion merely because a component file exists. Completion requires **runtime verification** on a physical device or simulator following the smoke path below.

Phases are **intentional**. Legacy screens reachable after Phase 3 are **planned backlog**, not accidental wiring errors—unless the inventory below lists the wrong active component (that would be a bug).

Legacy files may remain in the repository even when no longer mounted; **do not label them active** without tracing the runtime entry path.

---

## Phase map (summary)

| Phase | Scope | Status |
|------:|--------|--------|
| **1** | Design tokens; shared primitives; approved mockup structure in `designs/approved/` | ✅ **Complete** |
| **2** | Global dark theme; app shell; status bar; tab bar redesign | ✅ **Complete** |
| **3** | Home idle screen; Profile screen; Add Stop flow (dedicated full-screen); runtime path verified on device | ✅ **Complete** |
| **4** | Build Your Route (empty + populated); Workday Preview; route calculation transition; iOS road-following polylines; load-route / saved-workday sheets | 🔄 **In verification / mostly implemented** — not complete until **Optimize** is wired and device verification passes |
| **5** | Active Workday; route edit/reorder during workday; bottom action bar; workday completion surfaces | 🔄 **Partial / underway** |
| **6** | Visit Log (checked-in store UX); store detail and visit-history surfaces (individual statuses below) | 🔄 **Partial / started** |
| **7** | Remaining settings; imports; diagnostics; final visual polish; deferred integrations | ⏳ **Planned** |

### Phase 4 detail (in verification)

- Empty and populated **Build Your Route** states share `BuildRoutePlanningScreen`.
- **Empty state:** same screen with zero stops — large **Add Stop** action and prompt to add stops.
- Static **Start** and **Finish** cards on the planning list.
- Combined start/finish map marker when both locations are the same.
- Route summary bar attached **below** the map (not floating over it).
- **Add Stop** control remains visible beneath the stop list as stops are added.
- **Set Route** as the primary highlighted action.
- **Workday Preview** implemented from `designs/approved/4_preview_screen.png` via `WorkdayPreviewScreen`.
- **iOS road-following route polylines** via local MapKit module `modules/apple-map-directions/` (native rebuild required).
- **Optimize** control exists visually on the map summary bar but is **not fully wired** to route calculation.

### Phase 5 detail (partial)

- New **Active Workday** screen: collapsible map, progress metrics, Completed / Remaining / Skipped sections, finish card with navigation.
- **Active workday bottom bar:** Reorder · Add · Skip (`ActiveWorkdayBottomBar`).
- Tab bar **remains visible** during Active Workday.
- Tab order during workday: **Home · Stores · Visits · Stats**.
- Route reordering: **current**, **pending**, and **skipped** stops may move; **only completed** stops are locked.
- **`CompletedStopCard`** reused consistently for completed stops.
- **Skip Stop** is still a **placeholder**; real skip behavior and undo are **not** implemented.

### Phase 6 detail (partial / started)

- **Visit Log** screen implemented from `designs/approved/5a_visit_log.png`.
- Checked-in stores route to the redesigned Visit Log.
- **Store Overview**, Visits history tab, filters, sheets, and supporting flows retain their **individual** statuses in the inventory below — not all marked redesigned.

---

## Known open items

1. **Optimize** on the Build Your Route map bar is not fully wired to route calculation.
2. **Skip Stop** is a placeholder; real skip and undo behavior are missing.
3. **Apple Maps** uses the standard native map appearance; custom dark map art is not implemented.
4. **Weather** card tap-through to iOS Weather is deferred.
5. **Card gradients** on Home action cards were removed pending native rebuild support (`expo-linear-gradient`).
6. **Active Workday** and **Visit Log** still require full physical-device smoke verification.
7. **Legacy runtime components** may remain in the repository even when no longer used; do not label them active without tracing their runtime entry path.

---

## Runtime screen inventory

Routes and modes listed in **typical user reachability** order. **Active component** is what actually renders at runtime today (July 29, 2026).

### Primary redesigned / in-progress surfaces

| User-facing | Active component / file | Redesign status | Phase |
|-------------|-------------------------|-----------------|------:|
| **Home idle** | `components/home/home-idle-screen.tsx` | **Redesigned (3)** | 3 |
| **Add Stop** (full-screen) | `components/add-stop/add-stop-screen.tsx` | **Redesigned (3)** | 3 |
| **Build Your Route** | `components/coordinator/build-route-planning-screen.tsx` (via `CoordinatorPlanningScreen`) | **Partial (4)** — verification in progress | 4 |
| **Build Your Route — empty state** | Same runtime screen when stop count is zero; entry: Home → **New Workday** → zero-stop planning | **Partial (4)** — verification in progress | 4 |
| **Workday Preview** | `components/coordinator/workday-preview-screen.tsx` | **Redesigned (4)** — verification in progress | 4 |
| **Active Workday** | `components/coordinator/active-workday-screen.tsx` (via `CoordinatorLiveRouteScreen`) | **Partial (5)** | 5 |
| **Active Workday bottom bar** | `components/coordinator/active-workday-bottom-bar.tsx` | **Partial (5)** | 5 |
| **Visit Log** (checked-in) | `components/store/visit-log-screen.tsx` | **Partial (6)** | 6 |
| **Native iOS map directions** | `modules/apple-map-directions/` | **Implemented (native)** — `pod install` + `npx expo run:ios` required | 4 |

---

### Tab shell

| User-facing | Route / trigger | Active component / file | Redesign status | Phase |
|-------------|-----------------|-------------------------|-----------------|------:|
| Bottom tabs **Home · Stores · Visits · Stats** | `app/(tabs)/_layout.tsx` | `AdaptiveTabBar` → `StandardTabBar`; `HapticTab` | **Redesigned (2)** | 2 |
| Tab bar hidden | **Workday Preview (briefing)** only; completion restore; restoring | `preWorkdayTabBarHidden` + `mode` in `workday-navigation-context` | **Redesigned (2)** | 2 |
| Tab bar visible | Home idle, Build Your Route, **Active Workday**, Stores, Visits, Stats | Standard tab bar | **Redesigned (2)** | 2 |

**Note:** Active Workday intentionally **keeps** the four-tab bar visible (Reorder / Add / Skip sit above it).

---

### Home tab (`app/(tabs)/index.tsx`)

Coordinator modes from `resolveCoordinatorScreenMode()` in `utils/planned-route-briefing.ts`. All modes share the same route file; only one primary canvas shows at a time (plus overlays).

| User-facing | Entry / condition | Active component / file | Redesign status | Phase |
|-------------|-------------------|-------------------------|-----------------|------:|
| **Home idle** | `shouldShowRouteEntryLauncher` | `HomeIdleScreen` — `components/home/home-idle-screen.tsx` | **Redesigned (3)** | 3 |
| Loading today / workday restore | `screenMode === 'loading'` | Inline `ActivityIndicator` in `index.tsx` | **Shell only** | 7 |
| **Build Your Route** | `showRoutePlanningCanvas`, `screenMode === 'planning'`, `draft.phase === 'planning'` (not mid–active-workday add-stops legacy branch) | `CoordinatorPlanningScreen` → `BuildRoutePlanningScreen` — `components/coordinator/build-route-planning-screen.tsx` | **Partial (4)** | 4 |
| Add stops during active workday | `isAddingStopsDuringWorkday` | `CoordinatorPlanningScreen` (legacy planning layout branch) | **Legacy (4)** | 4 |
| Route calculation | `screenMode === 'calculating'` or `RouteCalculationTransition` visible | `RouteCalculationTransition` — `components/coordinator/route-calculation-transition.tsx` | **Legacy (4)** | 4 |
| **Workday Preview** | `screenMode === 'briefing'` | `WorkdayPreviewScreen` — `components/coordinator/workday-preview-screen.tsx` | **Redesigned (4)** — verify on device | 4 |
| **Active Workday** | `screenMode === 'active_workday'`, route started, not route-complete | `CoordinatorLiveRouteScreen` → `ActiveWorkdayScreen` + `ActiveWorkdayBottomBar` | **Partial (5)** | 5 |
| Route edit / reorder (during workday) | Reorder from bottom bar → route edit session | `StopsRouteEditPanel` — `components/stops/stops-route-edit-panel.tsx` | **Partial (5)** — shares reorder rules with planning | 5 |
| Route complete (celebration) | `showRouteComplete` during active workday | `RouteCompleteScreen` — `components/coordinator/route-complete-screen.tsx` | **Legacy (5)** | 5 |
| All visits finished (pre-workday) | `screenMode === 'completed_day'` | `WorkdayCompleteCard` — `components/today/workday-complete-card.tsx` | **Legacy (5)** | 5 |
| Fallback header (“Route”) | Non-planning/briefing/active modes when launcher hidden | `HomeHeader` — `components/home/home-header.tsx` | **Legacy (7)** | 7 |
| Open store from route | `handleOpenStore` | Stack: `app/store/[storeId].tsx` → `StoreOverviewScreen` | **Legacy (6)** — routes to Visit Log when checked in | 6 |

**Legacy / unused at runtime (do not treat as active without tracing):**

- `RouteLauncherScreen` — `components/coordinator/route-launcher-screen.tsx` (superseded by `HomeIdleScreen`).
- `DailyBriefingScreen` — `components/coordinator/daily-briefing-screen.tsx` (superseded by `WorkdayPreviewScreen` for briefing mode).
- `LiveStopList` as primary Active Workday canvas — replaced by `ActiveWorkdayScreen` for the started-route view; may remain for other branches or cleanup.

**Hidden / disabled UI:** `PlanningRouteDock` — gated by `ROUTE_PLANNING_DOCK_UI_ENABLED = false` in `index.tsx` (Set Route on Build Your Route footer is active).

---

### Home tab — overlays & sheets

| User-facing | Trigger | Active component / file | Redesign status | Phase |
|-------------|---------|-------------------------|-----------------|------:|
| **Add Stop** chooser / search / confirm | Build Your Route + Add Stop; start/finish card taps | `AddStopScreen` — `components/add-stop/add-stop-screen.tsx` | **Redesigned (3)** | 3 |
| Legacy add-stop modal | May remain in repo; trace entry before labeling active | `AddStopModal` — `components/coordinator/add-stop-modal.tsx` | **Legacy** — verify not mounted on primary path | 3 |
| Load saved route | Home Load Workday / planning load | `SavedRoutesSheet` — `components/coordinator/saved-routes-sheet.tsx` | **Legacy (4)** | 4 |
| Saved workdays | Planning ⋯ menu | `SavedWorkdaysSheet`, `SaveWorkdaySheet`, `WorkdayTemplateStopsSheet` | **Legacy (4)** | 4 |
| Edit stop details | Tap stop in planning list | `PlanningStopEditorSheet` — `components/coordinator/planning-stop-editor-sheet.tsx` | **Legacy (4)** | 4 |
| Deliveries scheduled today | Active Workday metrics → deliveries chip | `DeliveriesTodaySheet` — `components/active-workday/deliveries-today-sheet.tsx` | **Partial (5)** | 5 |

---

### Home tab — global overlays (providers)

| User-facing | Trigger | Active component / file | Redesign status | Phase |
|-------------|---------|-------------------------|-----------------|------:|
| Visit completion countdown / undo | After finish visit | `VisitCompletionOverlay` — `components/today/visit-completion-overlay.tsx` (via `VisitAdvancementProvider`) | **Legacy (5)** | 5 |

**Note:** `WorkdayDock` + `WorkdayMoreSheet` — `components/navigation/workday-dock.tsx`, `workday-more-sheet.tsx` — are **not mounted** while standard tabs are shown. Still **legacy** if re-enabled.

---

### Stores tab

| User-facing | Route | Active component / file | Redesign status | Phase |
|-------------|-------|-------------------------|-----------------|------:|
| Stores list (Today / All) | `app/(tabs)/stores.tsx` | Inline screen in `stores.tsx` | **Shell only** — dark `AppColors`; list/rows legacy layout | 7 |
| Store detail | Tap store → `/store/[storeId]` | `StoreOverviewScreen` — `components/store/store-overview-screen.tsx` | **Legacy (6)** — Visit Log when `checked_in` | 6 |

---

### Visits tab (`visit-history`)

| User-facing | Route | Active component / file | Redesign status | Phase |
|-------------|-------|-------------------------|-----------------|------:|
| Cross-store visit history | `app/(tabs)/visit-history.tsx` | Inline + `VisitHistoryRow`, filter bar, calendar sheet | **Legacy (6)** | 6 |

Visible in tab bar as **Visits** during pre-workday and Active Workday.

---

### Stats tab (route `history`)

| User-facing | Route | Active component / file | Redesign status | Phase |
|-------------|-------|-------------------------|-----------------|------:|
| Past workdays list | `app/(tabs)/history.tsx` | Inline `HistoryScreen` | **Legacy (7)** — explicit pre-redesign styling on some rows | 7 |
| Workday GPS detail | Row tap → `/diagnostics?tripId=` | `app/diagnostics.tsx` | **Legacy (7)** | 7 |

---

### Stack routes (no tab bar)

| User-facing | Route | Active component / file | Redesign status | Phase |
|-------------|-------|-------------------------|-----------------|------:|
| **Profile** | `app/profile.tsx` | `ProfileScreen` — `components/profile/profile-screen.tsx` | **Redesigned (3)** — embedded settings blocks may still be legacy styling | 3 |
| Settings (hidden tab; dev / Profile link) | `app/(tabs)/settings.tsx` | Inline settings + `MyLocationsSettings` | **Legacy (7)** | 7 |
| Import stores | `app/store-import/index.tsx` | `StoreImportWizard` — `components/store-import/store-import-wizard.tsx` | **Legacy (7)** | 7 |
| GPS diagnostics | `app/diagnostics.tsx` | Inline + `components/diagnostics/` | **Legacy (7)** | 7 |
| Order storage diagnostic | `app/order-storage-diagnostic.tsx` | Inline diagnostic screen | **Legacy (7)** | 7 |
| Expo template modal | `app/modal.tsx` | Template scaffold | **Legacy (7)** — not product UI | 7 |

---

### Store detail — sheets & sub-flows

Opened from `StoreOverviewScreen` — `components/store/store-overview-screen.tsx`.

| User-facing | Trigger | Active component / file | Redesign status | Phase |
|-------------|---------|-------------------------|-----------------|------:|
| **Visit Log** (checked-in) | Store overview when visit status is `checked_in` | `VisitLogScreen` — `components/store/visit-log-screen.tsx` | **Partial (6)** | 6 |
| Today's visit / check-in (not yet checked in) | Store overview | `TodaysVisitCard`, `CollapsibleVisitLog`, sections | **Legacy (6)** | 6 |
| Delivery / orders | Store overview | `DeliveryStatusSheet`, `PlaceOrderSheet`, `PendingOrdersSheet`, `OrderLogSheet` | **Legacy (6)** | 6 |
| Store info blocks | Store overview | `StoreInformationSection`, `OrdersSummaryCard`, `LastVisitCard` | **Legacy (6)** | 6 |

---

## Mockup ↔ runtime mapping (approved designs)

| Mockup (`designs/approved/`) | Primary runtime anchor | Inventory status |
|------------------------------|------------------------|------------------|
| 1 Home | `HomeIdleScreen` | Redesigned (3) |
| 2 Add Stop | `AddStopScreen` | Redesigned (3) |
| 3 Route Builder / Build Your Route | `BuildRoutePlanningScreen` | Partial (4) — verification |
| 4 Workday Preview | `WorkdayPreviewScreen` | Redesigned (4) — verification |
| 5 Active Workday | `ActiveWorkdayScreen` + `ActiveWorkdayBottomBar` | Partial (5) |
| 5a Visit Log | `VisitLogScreen` | Partial (6) |
| 7 Profile | `ProfileScreen` | Redesigned (3) |

---

## Existing anchors → business logic (unchanged by redesign)

| Mockup area | Logic owner (do not rewrite for UI) |
|-------------|-------------------------------------|
| Home / planning | `useRoutePlanning`, `useTodayRoute`, `index.tsx` handlers, `route-calculation` |
| Add Stop | `AddStopScreen` handlers, `route-calculation`, `searchStores`, geocoding services |
| Workday Preview | `buildDailyBriefingSummary`, `handleStartDay`, `startWorkday` |
| Active workday | `useWorkdayTrackerContext`, visit advancement, `StopsRouteEditPanel` / route edit commands, `active-route-editing` |
| Visit / store | `store-visits`, `store-orders`, `StoreOverviewScreen` → `VisitLogScreen` when checked in |
| Profile / settings | `workflow-preferences`, `useMyLocations`, `getStores` |
| iOS driving polylines | `modules/apple-map-directions/`, `resolve-driving-route-polyline`, planning/active map models |

---

## Mockup elements without full data (Version 1)

| Element | Approach |
|---------|----------|
| Weather on Home | Display-only (Open-Meteo); tap-through to iOS Weather **deferred** |
| Profile name / role / vehicle / license / city | Show only when persisted (not in schema today) |
| “Top Matches” intelligent ranking (Add Stop mockup) | Existing store search only until later phase |
| Archived store count | No archive model |
| Fabricated “Things to Know” (Preview mockup) | Derive from real signals where Workday Preview is wired |
| Stats tab dedicated analytics | Reuse `history` trip list until Phase 7 |
| Custom dark map tiles | Standard Apple/Google map appearance in V1 |
| Draggable map numbered pins (illustrated art) | Functional numbered markers; not illustrated mock art |

---

## Navigation / chrome (current behavior)

- **Build Your Route:** tab bar **visible**; back to Home **without** confirmation on planning (briefing back may still confirm).
- **Workday Preview:** tab bar **hidden** (`preWorkdayTabBarHidden`).
- **Active Workday:** tab bar **visible** — Home · Stores · Visits · Stats; bottom bar (Reorder · Add · Skip) sits above tab bar.
- **Visit Log:** stack navigation from store; tab bar depends on entry path (often from Active Workday store open).

---

## Verification checklist

### End-to-end smoke path (required before marking Phases 4–6 complete)

Run on **physical device or simulator** (iOS dev build for MapKit polylines):

1. **Home** idle
2. **New Workday**
3. **Empty Build Your Route** (zero stops, Add Stop prompt visible)
4. **Add Stop** (full-screen flow)
5. Add **multiple stops** (Add Stop remains below list)
6. **Set Route**
7. **Workday Preview**
8. **Start Day**
9. **Active Workday** (metrics, sections, bottom bar)
10. **Reorder** (enter edit mode from bottom bar)
11. **Check In** on current stop
12. **Visit Log**

### Additional cases

| Case | Expected |
|------|----------|
| Same start and finish location | Combined map marker; finish card still navigable |
| MapKit road-following route line | Driving polyline on iOS after native rebuild (not straight chords) |
| Completed stop during reorder | **Locked** — cannot drag |
| Current / pending / skipped during reorder | **Movable** |
| Tab bar during Active Workday | **Visible** — four tabs |
| Back from Build Your Route | Returns Home **without** leaving coordinator stuck |
| Back from Workday Preview | Does not strand user in irrecoverable coordinator state |
| DEV · Home reset | Escapes stuck coordinator (dev builds only) |

### Phase sign-off gates

- **Phase 3:** ✅ Complete — Home idle, Profile, Add Stop full-screen verified.
- **Phase 4:** Build Your Route empty + populated, Workday Preview, Set Route, MapKit polylines, **Optimize wired** — all smoke cases above through Start Day.
- **Phase 5:** Active Workday, bottom bar, reorder rules, Skip behavior (when implemented), route complete overlay.
- **Phase 6:** Visit Log checked-in path; store overview and visit-history tab individually restyled or explicitly deferred.
- **Phase 7:** Stores, Stats styling, settings/import/diagnostics polish, loading states.

---

## Logic preserved (all phases)

Route: `calculateTodayRoute`, `completeCalculation`, `resetRoutePlanningForNewRoute`, drag reorder, swipe delete, `mergeReorderedPendingVisitIds` (completed-only lock during active workday).

Workday: `startWorkday`, `useWorkdayTrackerContext`, visit advancement, undo check-in/complete.

Stores: `getStores`, import wizard, geocoding in add-stop.

Location / check-in: arrival services, `AutoCheckInMode`, permissions.
