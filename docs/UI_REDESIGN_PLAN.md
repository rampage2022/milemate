# MileMate UI redesign — implementation plan

## Migration status legend

| Status | Meaning |
|--------|---------|
| **Shell only** | Inherits Phase 1–2 dark tokens, tab bar, stack backgrounds, and spacing helpers. Screen layout and components are still the pre-mockup structure. |
| **Partial (Phase N)** | Phase N work started on this surface; not the full approved mockup. Verify in simulator before treating as complete. |
| **Redesigned (Phase N)** | Phase N mockup-aligned UI pass done and verified on device/simulator. |
| **Legacy (Phase N)** | Not yet restyled; scheduled for Phase N (or later). Expected to look pre-redesign until that phase ships. |

Phases are **intentional**. Legacy screens reachable after Phase 3 are **planned backlog**, not accidental wiring errors—unless the inventory below lists the wrong active component (that would be a bug).

---

## Phase map (summary)

| Phase | Scope | Status |
|------:|--------|--------|
| 1 | Redesign tokens, shared primitives, fade-in helper | ✅ Complete |
| 2 | Global theme wiring, navigation shell, `ScreenScaffold`, horizontal padding helpers | ✅ Complete |
| 3 | Home idle entry, Profile, Add Stop (`AddStopModal`) | 🔄 Partial — device verification in progress |
| 4 | Route Builder (planning), Workday Preview (briefing), route calculation overlay, load-route sheet | ⏳ Planned |
| 5 | Active Workday (live route timeline), route edit/reorder panel, workday completion surfaces | ⏳ Planned |
| 6 | Visit Log (store visit UX), Store detail / overview, visit-history tab content | ⏳ Planned |
| 7 | Stores tab, Stats/History tab, Settings (dev), import/diagnostics, polish & a11y | ⏳ Planned |

---

## Runtime screen inventory

Routes and modes listed in **typical user reachability** order. **Active component** is what actually renders at runtime today.

### Tab shell (always present when tabs shown)

| User-facing | Route / trigger | Active component / file | Redesign status | Phase |
|-------------|-----------------|-------------------------|-----------------|------:|
| Bottom tabs (Home, Stores, Stats) | `app/(tabs)/_layout.tsx` | `AdaptiveTabBar` → `StandardTabBar`; `HapticTab` | **Redesigned (2)** | 2 |
| Tab hidden | Workday, briefing, active route on Home, completion restore | `preWorkdayTabBarHidden` + `mode` in `workday-navigation-context` | **Redesigned (2)** | 2 |

---

### Home tab (`app/(tabs)/index.tsx`)

Coordinator modes from `resolveCoordinatorScreenMode()` in `utils/planned-route-briefing.ts`. All modes share the same route file; only one primary canvas shows at a time (plus overlays).

| User-facing | Entry / condition | Active component / file | Redesign status | Phase |
|-------------|-------------------|-------------------------|-----------------|------:|
| **Home idle** (no route / launcher) | `shouldShowRouteEntryLauncher` | `HomeIdleScreen` — `components/home/home-idle-screen.tsx` | **Partial (3)** — mockup actions/context; verify on device | 3 |
| Loading today / workday restore | `screenMode === 'loading'` | Inline `ActivityIndicator` in `index.tsx` | **Shell only** | 7 |
| **Route Builder** / planning | `showRoutePlanningCanvas`, `screenMode === 'planning'` (or add-stops during workday) | `CoordinatorPlanningScreen` — `components/coordinator/coordinator-planning-screen.tsx` | **Legacy (4)** — endpoints, stop list, blank actions, set route | 4 |
| Route calculation | `screenMode === 'calculating'` or `RouteCalculationTransition` visible | `RouteCalculationTransition` — `components/coordinator/route-calculation-transition.tsx` | **Legacy (4)** | 4 |
| **Workday Preview** / briefing | `screenMode === 'briefing'` | `DailyBriefingScreen` — `components/coordinator/daily-briefing-screen.tsx` | **Legacy (4)** | 4 |
| **Active Workday** | `screenMode === 'active_workday'`, not route-complete | `CoordinatorLiveRouteScreen` — `components/coordinator/coordinator-live-route-screen.tsx` → `LiveStopList`, `CurrentStopCard`, map blocks | **Legacy (5)** | 5 |
| Route complete (celebration) | `showRouteComplete` during active workday | `RouteCompleteScreen` — `components/coordinator/route-complete-screen.tsx` | **Legacy (5)** | 5 |
| All visits finished (pre-workday) | `screenMode === 'completed_day'` | `WorkdayCompleteCard` — `components/today/workday-complete-card.tsx` | **Legacy (5)** | 5 |
| Fallback header (“Route”) | Non-planning/briefing/active modes when launcher hidden | `HomeHeader` — `components/home/home-header.tsx` | **Legacy (7)** | 7 |
| Open store from route | `handleOpenStore` | Stack: `app/store/[storeId].tsx` → `StoreOverviewScreen` | **Legacy (6)** | 6 |

**Unused but present:** `RouteLauncherScreen` — `components/coordinator/route-launcher-screen.tsx` (replaced by `HomeIdleScreen`; safe to remove in cleanup).

**Hidden / disabled UI:** `PlanningRouteDock` — gated by `ROUTE_PLANNING_DOCK_UI_ENABLED = false` in `index.tsx` (inline Set Route on planning screen is active).

---

### Home tab — overlays & sheets (mounted from `index.tsx` / planning)

| User-facing | Trigger | Active component / file | Redesign status | Phase |
|-------------|---------|-------------------------|-----------------|------:|
| **Add Stop** (route stop) | Planning + / Add Stop / Add Stores → `showAddStop` | `AddStopModal` (`purpose="stop"`) — `components/coordinator/add-stop-modal.tsx` | **Partial (3)** — bottom sheet + primitives; verify on device | 3 |
| Set start / finish (planning) | `RouteEndpointCard` → `endpointEditor` | `AddStopModal` (`purpose="start"|"end"`) — same file | **Partial (3)** — shared modal chrome | 3 |
| Load saved route | Home Load Workday / planning load | `SavedRoutesSheet` — `components/coordinator/saved-routes-sheet.tsx` | **Legacy (4)** | 4 |
| Saved workdays | Planning header folder | `SavedWorkdaysSheet`, `SaveWorkdaySheet`, `WorkdayTemplateStopsSheet` | **Legacy (4)** | 4 |
| Edit stop details | Tap stop in planning list | `PlanningStopEditorSheet` — `components/coordinator/planning-stop-editor-sheet.tsx` | **Legacy (4)** | 4 |

---

### Home tab — global overlays (providers)

| User-facing | Trigger | Active component / file | Redesign status | Phase |
|-------------|---------|-------------------------|-----------------|------:|
| Visit completion countdown / undo | After finish visit | `VisitCompletionOverlay` — `components/today/visit-completion-overlay.tsx` (via `VisitAdvancementProvider`) | **Legacy (5)** | 5 |
| Route edit / reorder (during workday) | Edit route from live list | `StopsRouteEditPanel` — `components/stops/stops-route-edit-panel.tsx` inside `LiveStopList` | **Legacy (5)** | 5 |

**Note:** `WorkdayDock` + `WorkdayMoreSheet` — `components/navigation/workday-dock.tsx`, `workday-more-sheet.tsx` — are **not mounted** while `AdaptiveTabBar` hides workday chrome (Phase 2). Still **legacy** if re-enabled.

---

### Stores tab

| User-facing | Route | Active component / file | Redesign status | Phase |
|-------------|-------|-------------------------|-----------------|------:|
| Stores list (Today / All) | `app/(tabs)/stores.tsx` | Inline screen in `stores.tsx` | **Shell only** — dark `AppColors`; list/rows legacy layout | 7 |
| Store detail | Tap store → `/store/[storeId]` | `StoreOverviewScreen` — `components/store/store-overview-screen.tsx` | **Legacy (6)** | 6 |

---

### Stats tab (label; route `history`)

| User-facing | Route | Active component / file | Redesign status | Phase |
|-------------|-------|-------------------------|-----------------|------:|
| Past workdays list | `app/(tabs)/history.tsx` | Inline `HistoryScreen` | **Legacy (7)** — light gray `#f4f4f4` / white rows (explicit pre-redesign styling) | 7 |
| Workday GPS detail | Row tap → `/diagnostics?tripId=` | `app/diagnostics.tsx` | **Legacy (7)** | 7 |

---

### Stack routes (no tab bar)

| User-facing | Route | Active component / file | Redesign status | Phase |
|-------------|-------|-------------------------|-----------------|------:|
| **Profile** | `app/profile.tsx` | `ProfileScreen` — `components/profile/profile-screen.tsx` | **Partial (3)** — sections + `MyLocationsSettings` embed still legacy styling inside | 3 |
| Settings (hidden tab; dev / Profile link) | `app/(tabs)/settings.tsx` | Inline settings + `MyLocationsSettings` | **Legacy (7)** — white cards `#FFFFFF` | 7 |
| Import stores | `app/store-import/index.tsx` | `StoreImportWizard` — `components/store-import/store-import-wizard.tsx` | **Legacy (7)** | 7 |
| GPS diagnostics | `app/diagnostics.tsx` | Inline + diagnostic components under `components/diagnostics/` | **Legacy (7)** | 7 |
| Order storage diagnostic | `app/order-storage-diagnostic.tsx` | Inline diagnostic screen | **Legacy (7)** | 7 |
| Expo template modal | `app/modal.tsx` | `ThemedView` / `ThemedText` template | **Legacy (7)** — not product UI | 7 |

---

### Visit History (hidden tab; optional path)

| User-facing | Route | Active component / file | Redesign status | Phase |
|-------------|-------|-------------------------|-----------------|------:|
| Visit log list (historical) | `app/(tabs)/visit-history.tsx` | Inline + `VisitHistoryRow`, filter bar, calendar sheet | **Legacy (6)** | 6 |

Reachable when tab bar is shown and user navigates to `visit-history` (e.g. deep link); not in pre-workday tab strip.

---

### Store detail — sheets & sub-flows (Phase 6 Visit Log scope)

Opened from `StoreOverviewScreen` — `components/store/store-overview-screen.tsx`.

| User-facing | Trigger | Active component / file | Redesign status | Phase |
|-------------|---------|-------------------------|-----------------|------:|
| Today’s visit / check-in | Store overview | `TodaysVisitCard`, `CollapsibleVisitLog`, sections | **Legacy (6)** | 6 |
| Delivery / orders | Store overview | `DeliveryStatusSheet`, `PlaceOrderSheet`, `PendingOrdersSheet`, `OrderLogSheet` | **Legacy (6)** | 6 |
| Store info blocks | Store overview | `StoreInformationSection`, `OrdersSummaryCard`, `LastVisitCard` | **Legacy (6)** | 6 |

During active workday, **current stop** UX also uses `CurrentStopCard` — `components/stops/current-stop-card.tsx` on live route (**Legacy (5)**), then store stack for deeper visit work.

---

## Mockup ↔ runtime mapping (approved designs)

| Mockup (see `designs/approved/`) | Primary runtime anchor | Inventory status |
|----------------------------------|------------------------|------------------|
| 1 Home | `HomeIdleScreen` when launcher visible | Partial (3) |
| 2 Add Stop | `AddStopModal` from planning | Partial (3) |
| 3 Route Builder | `CoordinatorPlanningScreen` | Legacy (4) |
| 4 Workday Preview | `DailyBriefingScreen` | Legacy (4) |
| 5 Active Workday | `CoordinatorLiveRouteScreen` / `LiveStopList` | Legacy (5) |
| 5a Visit Log | `StoreOverviewScreen` (+ visit widgets TBD) | Legacy (6) |
| 7 Profile | `ProfileScreen` | Partial (3) |

---

## Existing anchors → business logic (unchanged by redesign)

| Mockup area | Logic owner (do not rewrite for UI) |
|-------------|-------------------------------------|
| Home / planning | `useRoutePlanning`, `useTodayRoute`, `index.tsx` handlers, `route-calculation` |
| Add Stop | `AddStopModal` handlers, `route-calculation`, `searchStores`, geocoding services |
| Briefing | `buildDailyBriefingSummary`, `handleStartDay`, `startWorkday` |
| Active workday | `useWorkdayTrackerContext`, `LiveStopList`, route edit commands, visit advancement |
| Visit / store | `store-visits`, `store-orders`, `StoreOverviewScreen` data loaders |
| Profile / settings | `workflow-preferences`, `useMyLocations`, `getStores` |

---

## Mockup elements without full data (Version 1)

| Element | Approach |
|---------|----------|
| Weather on Home | Omit — no weather service |
| Profile name / role / vehicle / license / city | Show only when persisted (not in schema today) |
| “Top Matches” intelligent ranking (Add Stop mockup) | Existing store search only until later phase |
| Archived store count | No archive model |
| Fabricated “Things to Know” (Preview mockup) | Derive from real signals when Preview is redesigned (Phase 4) |
| Stats tab dedicated analytics | Reuse `history` trip list until Phase 7 |
| Draggable map numbered pins | Not in V1 |

---

## Navigation / chrome conflicts (spec wins)

- Active Workday mockup shows bottom tabs; implementation hides tabs on Preview and Active Workday — **intentional (Phase 2)**.
- Visit Log mockup shows bottom tabs; store/visit flows use stack back — **intentional (Phase 6)**.

---

## Verification checklist (by phase)

Use this when signing off each phase on simulator/device:

- **Phase 3:** Home idle, Profile, Add Stop chooser + existing/enter/confirm (from planning).
- **Phase 4:** Planning canvas, briefing, calculation transition, saved routes sheet.
- **Phase 5:** Live route list, progress, edit panel, route complete, visit completion overlay.
- **Phase 6:** Store overview as visit log; visit-history tab.
- **Phase 7:** Stores, Stats/history list styling, settings/import/diagnostics, loading states polish.

---

## Logic preserved (all phases)

Route: `calculateTodayRoute`, `completeCalculation`, `resetRoutePlanningForNewRoute`, drag reorder, swipe delete.

Workday: `startWorkday`, `useWorkdayTrackerContext`, visit advancement, undo check-in/complete.

Stores: `getStores`, import wizard, geocoding in add-stop.

Location / check-in: arrival services, `AutoCheckInMode`, permissions.
