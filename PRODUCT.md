# MileMate — Product Definition

**Document type:** Internal product specification  
**Status:** Active  
**Last updated:** July 2026

---

## Vision

MileMate records how far people drive without asking them to manage an app. The product succeeds when tracking is invisible—workdays are captured, stored, and ready when needed, with no logbook discipline required from the driver.

We are not building a fleet management platform, a navigation app, or an AI assistant. We are building a system that documents mileage while the driver works.

---

## Mission

Drivers should work. The app should document.

MileMate exists to close the gap between driving and having a defensible mileage record. Every feature must either automate capture, reduce required interaction, or increase trust in the recorded data. Features that add management overhead without improving the record are out of scope.

---

## Target Audience

### Primary

**Independent workers who drive for work and will not maintain a manual log.**

This includes freelancers, contractors, real estate agents, field service workers, and small business owners who deduct or bill for vehicle use. They:

- Drive intermittently for work, not as full-time couriers
- Need accurate records for taxes or reimbursements
- Will not reliably tap an app at the start and end of every workday
- Want mileage handled in the background of their actual job

### Secondary (post-v1)

- Employees who track mileage for reimbursement without corporate tooling
- Individuals who want passive driving records for personal use

### Non-target

- Fleet operators managing multiple drivers and vehicles
- Logistics companies requiring dispatch integration
- Users who need real-time navigation or route optimization
- Users who want a conversational AI interface to manage their drives

---

## Design Philosophy

These five principles are the product standard. They override feature requests, UI preferences, and technical convenience.

### 1. The app should disappear

The best compliment a driver can give is: *"I forgot it was even running."*

MileMate should not demand attention during a drive. No persistent UI chrome, no mid-workday prompts, no celebratory feedback. The app earns trust by being absent. If the driver remembers the app, we have likely failed.

**Implications:**
- Prefer background operation over foreground interaction
- Minimize notifications to high-confidence, actionable events only
- The home screen confirms state; it does not become a dashboard the driver visits regularly
- History and export are for review periods (weekly, monthly, tax season)—not daily use

### 2. Every tap is a tax

Every interaction has a cost. If the app can infer something accurately, it should.

Do not make the driver tap to start, stop, categorize, name, or confirm what the system already knows or can detect with high confidence. Each required tap is friction that compounds across hundreds of workdays per year.

**Implications:**
- Manual start/stop is a fallback, not the end state
- Defaults should be inferred (time of day, day of week, frequent routes, prior behavior)
- Settings are for correcting inference, not for completing it
- Onboarding collects only what cannot be inferred later

### 3. Automation beats documentation

Drivers should work. The app should document.

The driver’s job is driving and doing their work. MileMate’s job is producing a complete, accurate log. We do not shift documentation labor onto the driver to make engineering easier.

**Implications:**
- Workday detection, duration, and distance are system responsibilities
- Categorization (business vs. personal) should be automated where confidence is sufficient
- Export and report generation are automated outputs, not manual assembly tasks
- v1 may require manual workday control to validate the recording pipeline; that is a temporary constraint, not a product direction

### 4. Confidence over cleverness

If automation is only 70% reliable, ask the driver. Don’t guess.

Silent wrong data is worse than a single prompt. Automation is only valuable when the driver can trust the record without auditing every entry. Prefer conservative behavior and explicit confirmation over clever inference that corrupts the log.

**Implications:**
- Define confidence thresholds before automating a decision
- Low-confidence inferences surface a brief, specific question—not a form
- Distance calculation uses conservative, well-understood methods; display precision matches data quality
- Never auto-classify a workday when confidence is below threshold
- Err toward leaving a field empty or flagged rather than filling it incorrectly

### 5. AI works silently

AI should finish work. Not create conversations.

AI in MileMate is a processing layer—classification, deduplication, gap-filling, export formatting—not a chatbot, copilot, or onboarding guide. The driver should not have to talk to the app to benefit from it.

**Implications:**
- No conversational UI, no open-ended prompts, no “How can I help?”
- AI output appears as completed records, suggested corrections, or generated exports
- Human input is requested only for discrete, high-stakes decisions AI cannot make confidently
- AI features must be explainable after the fact (why a workday was classified a certain way) without requiring real-time dialogue

---

## Version 1 Scope

v1 validates the recording and persistence pipeline. It does not yet deliver the full philosophy—manual workday control is an engineering constraint, not the long-term interaction model.

### In scope

| Capability | Description |
|------------|-------------|
| **Workday tracking** | Start and end a workday manually from the home screen |
| **Live distance** | Display accumulated mileage while a workday is active |
| **Foreground GPS** | Calculate distance using device location while the app is open and tracking |
| **Local persistence** | Save completed workdays to on-device storage |
| **Workday history** | View a list of past workdays with date and distance |
| **Workday record** | Each workday records ID, start time, optional end time, and total miles (stored as `Trip` in code) |

### Out of scope (v1)

| Capability | Rationale |
|------------|-----------|
| Automatic workday detection | Requires motion/background signals; deferred until manual pipeline is proven |
| Background GPS tracking | Platform complexity; required for “disappear” goal but not for v1 validation |
| User accounts / authentication | Local-first; no server dependency |
| Cloud sync | Deferred until local recording is dependable |
| Workday categories (business/personal) | Requires confidence thresholds and AI classification—not ready for v1 |
| AI features of any kind | No silent processing layer until workday capture is reliable |
| Vehicle management | Single implicit vehicle; no taps to configure |
| Maps / route replay | Does not improve the core record |
| Export (CSV, PDF, IRS formats) | Automated output; deferred to v1.1 |
| Workday detail screen | History list is sufficient for v1 review |
| Edit or delete workdays | Deferred; reduces integrity risk during initial build |
| Conversational UI | Violates principle 5 |

### v1 success criteria

1. A user can start a workday, drive, end the workday, and see the recorded distance in history.
2. Workday data persists across app restarts (stored as `Trip` records).
3. Distance calculation uses GPS coordinates and a standard great-circle formula.
4. The app functions without an internet connection after initial install.
5. No user account or onboarding flow is required to record a first workday.
6. The architecture supports adding automatic workday detection without rewriting the data layer.

### v1 explicit non-goals

- v1 does not optimize for “I forgot it was running.” That is the v1.1+ target once background capture ships.
- v1 does not reduce taps through inference. It establishes that manual capture produces trustworthy data.

---

## Engineering Principles

These govern implementation. They must not conflict with the design philosophy above.

### 1. Thin screens, fat hooks, isolated services

- `app/` screens handle layout and navigation only
- `hooks/` orchestrate state and coordinate services
- `services/` own side effects (GPS, storage)
- `utils/` contain pure functions with no framework dependencies

Screens must not import platform APIs directly.

### 2. Build toward automation

Structure code so workday lifecycle can later be driven by motion detection, not button presses. The `Trip` type (technical: one GPS session), storage service, and distance utilities should not assume a user tap started or ended the workday.

### 3. Confidence thresholds are explicit

Any automated decision (workday start, workday end, category assignment) must define its confidence requirement in code. Below threshold: defer to user prompt or leave unset. Never silently apply low-confidence inference.

### 4. One domain type

A single `Trip` type represents active and completed GPS sessions. Hooks expose this as **Workday** to screens. Use optional fields (e.g., `endedAt`) to express lifecycle state rather than maintaining parallel types.

### 5. Pure math, impure edges

Distance calculation and formatting logic must be pure and testable. Location access and persistence live at the edges and are swappable.

### 6. Safe storage defaults

Reading from local storage returns empty or filtered results on corruption—never throw to the UI. Write operations are explicit and idempotent where possible.

### 7. Local-first

Workday data belongs on the device (stored as `Trip` records). Network connectivity is not required to track or review workdays. Cloud sync, if added, wraps local storage—it does not replace it.

### 8. Expo-native stack

Use Expo SDK packages (`expo-location`, `expo-router`) and install native dependencies through `expo install`. Read versioned Expo docs before adding platform capabilities.

### 9. YAGNI for structure

Add folders, abstractions, and dependencies only when a second consumer exists or when side effects require isolation.

### 10. Test what matters

Prioritize tests for distance calculation, trip persistence, and confidence-gated automation. UI snapshot tests are low priority for v1.

---

## Open Questions

Items requiring a product decision before or shortly after v1:

1. **Confidence threshold for auto workday detection** — What signal quality is required before starting a workday without user action?
2. **Confidence threshold for categorization** — At what confidence do we auto-assign business vs. personal vs. prompt?
3. **Low-confidence prompt design** — How do we ask without breaking “the app should disappear”? (Likely: post-workday, batch, minimal)
4. **Active workday recovery** — If the app is killed mid-workday, resume silently or ask?
5. **Minimum workday distance** — Filter GPS noise without discarding legitimate short drives?
6. **Distance unit** — Infer from locale or require a setting (setting = a tap)?
7. **Export format** — IRS-compliant log is a likely v1.1 deliverable; define required fields and automation level.
8. **Monetization** — Out of engineering scope for v1; affects sync and export roadmap.

---

## Roadmap Sketch (post-v1)

Not committed. Ordered by alignment with design philosophy.

| Version | Focus |
|---------|-------|
| **v1.1** | Background GPS, automatic workday start/stop, silent recovery |
| **v1.2** | Confidence-gated business/personal classification, CSV/IRS export |
| **v2.0** | Silent AI for gap-filling and deduplication, cloud backup, multi-device sync |

Manual start/stop in v1 is a foundation. Background automation in v1.1 is the first step toward the product actually disappearing.

---

## Status System

MileMate uses one shared status language across route lists, Visit History, completion summaries, and store detail.

| Token | Color | Meaning |
|-------|-------|---------|
| **Completed** | Green | Successfully finished; no action required |
| **Skipped** | Orange | Intentionally bypassed or deferred; not an error by default |
| **Delivery** | Blue | Informational delivery-related state |
| **Issue** | Red | Requires attention (e.g. visit notes flagged as problems) |
| **Pending** | Gray | Upcoming or inactive stops |
| **Active / accent** | MileMate blue | Current focus — current stop or active workflow |

Implementation helpers live in `utils/milemate-status.ts` (`getStatusColor`, `getStatusLabel`, etc.). Do not hardcode one-off status colors on new screens.

**Navigation mental model**

- **Route** looks forward (current, next, pending).
- **Visit History** looks backward (completed and skipped visits only).

---

## Terminology

| Term | Layer | Definition |
|------|-------|------------|
| **Workday** | Product | What the driver sees and manages. All user-facing labels, screen copy, and hook APIs use this word. |
| **Trip** | Technical | A single GPS tracking session stored as `{ id, startedAt, endedAt?, distanceMiles }` in `types/trip.ts`. In v1, one active workday maps to one trip. |

**Bridge rule:** Hooks (`useWorkdayTracker`) expose Workday-shaped state. Services (`getTrips`, `saveTrip`) and types (`Trip`) stay technical. Screens never import service functions for trips directly when a hook is available.

---

## References

- Architecture: `types/`, `utils/`, `services/`, `hooks/`, `app/`
- Platform: Expo SDK 54, React Native, file-based routing via Expo Router
- Persistence: `@react-native-async-storage/async-storage`
- Location: `expo-location` (foreground in v1; background in v1.1)
