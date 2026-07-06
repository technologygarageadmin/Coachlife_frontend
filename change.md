# CoachLife - Clarity Redesign Plan

> `fixed.md` is the log of what already shipped. **This file is the forward plan**:
> how to turn CoachLife from "many pages that each do a piece of everything" into
> a system where every person knows exactly where to go and what to click.

---

## 1. The problem in one sentence

**The same job lives in 3–4 different pages, and the one concept that would tie
them together - "a class that happened on a date" - doesn't exist**, so admins
and coaches stitch it together in their heads. That's the batch headache.

### Proof: the duplication map (as the app is today)

| Job | Where you can do it today | Places |
|---|---|---|
| Mark attendance | Admin → Attendance (3 tabs) · Coach → Batch Session screen · Coach → inside Session Detail | **3** |
| Generate a session card | Session Card Mgmt (By Student) · Session Card Mgmt (By Batch) · Coach → Start Session · Custom Card builder | **4** |
| Look at a batch | Manage Batches · Attendance → Batch tab · Session Card Mgmt → By Batch · Coach → Start Session → By Batch | **4** |
| Edit card/activity content | Edit Session Card · Custom Card builder · Activity Editor | **3** |
| See what session a player is on | Session pill (batch view) · Attendance table · Player cards list · Coach player list | **4** |

Every row in that table is a place where two screens can disagree, and a place
where a new coach/admin gets lost. **The fix is not more features - it is one
home per job.**

---

## 2. What each user actually wants (the POV that drives everything)

### The Coach's whole world (should be 3 steps)

> "I open the app. It shows me **today's class**. I tap it, tick who's here,
> press **Start Session**. I coach, tick activities done / not done per kid,
> press **Finish**. Points happen. I go home."

A coach should **never** see or think about: generate card, batchGroupId,
pending status, session numbers being wrong, "card not found", or which admin
page to ask about. If the coach needs admin knowledge to coach, the design is wrong.

### The Admin's whole world (4 pillars)

> 1. **Curriculum** - I write the pathway sessions & activities once.
> 2. **People** - I add players and coaches.
> 3. **Batches** - I make a batch: players + coach + schedule + pathway. Then
>    the batch runs itself; I just watch its progress on ONE page.
> 4. **Exceptions** - kid missed a class, wrong date, content tweak → I fix it
>    **from that same batch page**, not by hunting across 3 modules.

---

## 3. The one missing concept: **Class Session**

Everything painful traces to this absence. A **Class Session** = *"Batch X met
on date D for pathway session N."* One record, everything hangs off it:

```js
ClassSession {
  classSessionId, batchId, sessionDate, sessionNumber, LearningPathway,
  status: 'scheduled' | 'in_progress' | 'done' | 'missed',
  content: { Topic, Objective, activities[], sessionTakeaways[] },   // ONE shared copy
  players: [{
    playerId, attendance: 'present'|'absent',
    sessionCardId,                  // their personal copy (ratings/feedback live here)
    outcome: 'done'|'partial'|'missed'
  }],
  startedBy, startedAt, completedAt
}
```

What this single object replaces:
- ❌ session-number guessing → ✅ stamped once on the ClassSession
- ❌ attendance and cards diverging → ✅ same record
- ❌ `batchGroupId` string hack for propagation → ✅ edit `content`, done
- ❌ "mark pending, then generate, per player, from the browser" → ✅ **Start Session**
  does it all server-side in one call
- ❌ 4 pages each showing a different slice of a batch → ✅ the batch's Sessions
  tab lists its ClassSessions; that IS the batch's history

*(This is the `BatchSession` from fixed.md §3.3 - now it becomes the plan's
centerpiece rather than a "later maybe".)*

---

## 4. Target screen map - before → after

### Admin sidebar

| Today (9 items, overlapping) | Target (7 items, one home per job) |
|---|---|
| Dashboard | Dashboard |
| Players | Players |
| Coaches | Coaches |
| Assign Players | *(merged into Players + Batch page)* |
| **Session Card** | ❌ removed - lives inside Batch page & Player page |
| **Attendance** | ❌ removed - lives inside Batch page & Player page |
| **Manage Batches** | **Batches** ← the hub |
| Learning Pathway | Curriculum |
| Rewards / Redemption / Leaderboard | Rewards / Redemption / Leaderboard |

### The new **Batch page** (admin) - the headache killer

One page per batch, four tabs. Every batch question answered here:

```
┌─ Batch: "Sunday 8-9am Junior" ────────────────────────────────┐
│ Coach: Priya · Pathway: AI Foundation · Sun 8:00-9:00 · 6 kids│
├───────────────────────────────────────────────────────────────┤
│ [Overview] [Sessions] [Attendance] [Settings]                 │
│                                                               │
│ SESSIONS tab:                                                 │
│  ▶ Next: Session 7 "Wi-Fi Basics"  [Preview & Edit] [Schedule]│
│  ✓ Jun 29 · Session 6 · 5 present, 1 absent      [Details]    │
│  ✓ Jun 22 · Session 5 · all present              [Details]    │
│  ⚠ Jun 15 · Session 4 · MISSED (rescheduled)     [Fix]        │
└───────────────────────────────────────────────────────────────┘
```

- **Overview**: roster (with each kid's current session + points), coach, schedule.
- **Sessions**: list of ClassSessions (past + next). "Preview & Edit" = today's
  staging editor. "Details" of a past one = per-player attendance + card links.
- **Attendance**: calendar view scoped to THIS batch (replaces the global 3-tab page).
- **Settings**: rename, days/time, pathway, add/remove players, change coach, delete.

### Player page (admin + coach share it)

The *other* axis. Batch page answers "what's up with the group"; Player page
answers "what's up with this kid": profile · card history (grouped by pathway -
this delivers the summer-camp tabs) · attendance record · points/redemptions.

### Coach side

| Today | Target |
|---|---|
| Dashboard (generic) | **Today** - today's classes on top: one tap in |
| My Players | My Players (unchanged) |
| Start Session (2 modes, card mgmt-ish) | ❌ removed - replaced by Today + My Batches |
| Batch Session screen (attendance + chips, disconnected) | **Class Room** screen (below) |
| Past Sessions | Past Sessions (+ pathway tabs) |

### The **Class Room** screen (coach) - the 3-step flow

```
Step 1  Roster: [✓ Anaya] [✓ Dev] [✗ Sana - absent] ...  → [▶ Start Session]
Step 2  (server creates ClassSession, cards for present kids, carry-forward
         and stuck-card recovery happen silently)
        Tabs: ( Anaya | Dev | Rahul | ... ) → each tab = their card,
        activities ticked ✓ done / ✗ not done, star + note per activity
Step 3  [Finish Class] → summary (points per kid, WhatsApp feedback) → done
```

Coach never leaves this screen during a class.

---

## 5. One status vocabulary (users see FOUR words, never more)

| User sees | Internal statuses it covers |
|---|---|
| **Scheduled** | draft, upcoming |
| **In Progress** | in_progress, "in progress" |
| **Done** | completed |
| **Missed** | pending, absent, excused, not_completed (session-level) |

One shared `<StatusBadge/>` component, used on every card/session/class
everywhere. Internal statuses stay in the DB; they just never leak into the UI
as seven different raw strings again.

---

## 6. The golden flows (write these on the wall)

**Coach, on class day:** Today → tap class → tick attendance → Start Session→
coach through player tabs → Finish. *(0 admin concepts needed)*

**Admin, weekly:** Batches → glance at each batch's "Next / Last" line →
open one → Sessions tab if something's ⚠.

**Exception - kid missed last week:** Batch → Sessions → the ⚠ row → Fix →
choose: *carry forward into next class* (default, automatic anyway) or
*schedule a make-up ClassSession*. That's it. No status archaeology.

**Exception - content tweak for this week:** Batch → Sessions → Next →
Preview & Edit → change activity → Save → applies to the whole class.

---

## 7. The phased plan

### Phase 0 - Turn on what's already built *(blocker, 1 action)*
- [ ] **Deploy the two container Lambdas** (`CL_Session_Card_Generating` from
  `backend/CL_Generate_session_card/app.py`, `CL_Custome_Sessioncard` from
  `backend/CL_Generate_Custom_Session_Card/code.py`). Until then, several
  shipped features are dormant: sessionDate stamping at generation, batch
  pathway inheritance, server-side auto-pending, carry-forward, custom-card
  batchGroupId. Everything below assumes these are live.

### Phase 1 - Coach clarity *(frontend only · biggest pain relief per hour)*
- [x] **Today screen**: `CoachDashboard.jsx` now has a "Today's Classes" strip
  (batches where `days` includes today's weekday), each with a **Start Session**
  button straight into the Class Room. `FE`
- [x] **Class Room v1**: `BatchSessionView.jsx` rebuilt as the 2-step flow -
  roster (tick who's here) → **Start Session**, which in one action saves
  attendance, auto-recovers any hanging card (marks it `pending` via
  `CL_Update_Session_Card`, same trick from `fixed.md`), and generates a fresh
  card for every present player who needs one. Then shows present-player tabs
  only (absent players are hidden, not just greyed out) - tap a name to coach.
  What used to be 2 separate user actions (submit attendance, then go generate
  cards elsewhere) is now one button. `FE`
- [x] **Player tabs in SessionDetail** for batch context - already existed
  (`batchPlayerCards`/`activePlayerId` state + tab bar), confirmed compatible
  with the new Class Room's navigation payload. No changes needed. `FE`
- [x] **StatusBadge + shared vocabulary** - new `components/StatusBadge.jsx` +
  `utils/statusGroups.js` (the color/label mapping, split out so both the
  badge and any custom accent-color usage share one source of truth). Wired
  into: Class Room, `CoachDashboard.jsx` (today's classes + recent cards),
  `SessionCardsView.jsx` (was falling back to the **raw status string** on an
  unrecognized value - the exact leak the plan called out), `PlayerSessions.jsx`
  (section titles collapsed from 5 raw-status words to the 4-word vocabulary:
  "Pending / Absent" → "Missed", "Upcoming" → "Scheduled", "Completed" → "Done").
  Not yet swept: admin-side pages (Phase 2 territory) and a few less-visible
  coach pages (`viewCompletedSessionCard.jsx`, `PlayerDetail.jsx`).
- [ ] Remove coach "Start Session" page from nav once Today + My Batches cover
  it. **Deliberately not done yet** - "By Student"/"By Batch" tabs there still
  cover cases Today's Classes doesn't (a batch not meeting today, an ad-hoc/
  make-up session for one player). Revisit once Phase 2's Batch Hub exists.

### Phase 2 - Admin Batch Hub *(frontend restructure)*
- [x] Build **BatchDetail** page at `/admin/batches/:batchId`
  (`pages/admin/BatchDetail.jsx`) with 4 tabs:
  - **Overview** - roster + coach assign/remove, moved directly from
    `ManageBatches.jsx`'s old inline detail panel.
  - **Settings** - rename/schedule/pathway/players edit form + delete, also
    moved from `ManageBatches.jsx`'s edit modal (now a real form, not a modal
    stacked on a list page).
  - **Sessions** - per-player real session #/date/status (reusing the
    `CL_View_Sessioncard`-per-player pattern from Phase 1), plus a **Manage &
    Generate Sessions** button that deep-links into the existing
    `SessionCardManage.jsx` batch flow (pre-selected via the `location.state.batchId`
    bridge that already existed). **Scoped intentionally**: the full
    generate/preview/staging system built during `fixed.md` (date picker,
    preview modal, per-row Edit, "Edit Whole Batch", auto-pending recovery) was
    *not* duplicated into this new file - it's ~400 lines of already-tested
    logic, and copying it here risked drift/regressions for no real gain. It
    stays the single home for that job until a real extraction into a shared
    component happens.
  - **Attendance** - built fresh, not ported: a simple date + present/absent
    roster + save, reusing the same card-status fetch as Sessions (no more of
    `Attendance.jsx`'s old 4-level session-number-guessing fallback chain -
    the real stored value is just read directly).
  `FE`
- [x] **Batches list page → simple cards → BatchDetail.** `ManageBatches.jsx`
  rewritten from a list+inline-detail split view into a pure directory: a grid
  of batch cards (name, pathway, schedule, player/coach counts, hover
  tooltip with rosters) that navigate into BatchDetail on click. Only the
  "New Batch" create action remains here; editing an existing batch now
  happens in BatchDetail's Settings tab. Sidebar label renamed "Manage
  Batches" → "Batches" to match. `FE`
- [x] **Duplicate delete-modal** - checked `SessionCardManage.jsx`: already
  fixed (single `deleteConfirm` state, single Modal block). The stale gotcha
  note in `CLAUDE.md` describing it as an open issue has been removed. `FE`
- [x] **Player page absorbs the per-student card list + per-player attendance.**
  `pages/coach/PlayerDetail.jsx` is shared by both `/admin/player-detail/:playerId`
  and `/coach/player/:playerId` (one component, gated by an `isAdmin` check) -
  it already showed a player's full session history grouped by status *and*
  pathway (`groupSessionsByPathway`, which is most of Phase 4's pathway-tabs
  goal, done incidentally). Added, admin-only:
  - **Generate Next Session** button - calls the generate endpoint directly on
    this page (no more detour to Session Card Management's "By Student" tab
    just to make one card).
  - **Attendance History** section - this player's full record list (date,
    session #, batch, status), moved from `Attendance.jsx`'s "Player" tab.
  - Session links now route through a role-aware `sessionLink()` helper: admin
    → `/admin/view-session-card/:id` (read-only), coach → the existing
    `/coach/session/:id` / `/coach/view-completed-session/:id`. This also fixed
    a **pre-existing bug**: admin clicks previously hit coach-only routes and
    would have been blocked by `ProtectedRoute`.
  - Fixed a second raw-status leak (`session.status === 'in_progress' ? 'In
    Progress' : session.status || 'Upcoming'` - same class of bug as the one
    found in `SessionCardsView.jsx` during Phase 1) via `StatusBadge`.
  - Wired admin's `Players.jsx` profile modal with a "View Full Profile &
    Sessions" button, since nothing previously routed admins to this page at
    all (only `LeaderBoard.jsx` linked here before).
  **Not absorbed**: deleting a card (a rarer action, still only in Session
  Card Management). `FE`
- [ ] Sidebar cleanup: remove Session Card / Attendance as top-level items.
  **Still not done** - `SessionCardManage.jsx`'s batch-generate/preview/staging
  system (Sessions tab deep-links there) and card deletion aren't absorbed
  anywhere else yet, so both pages remain necessary destinations, just no
  longer the *only* way to see one player's or one batch's story.

### Phase 3 - ClassSession backend *(the real fix)*
- [ ] New Lambda `CL_Manage_ClassSession` + `ClassSessions` collection.
  Actions: `start` (creates record, generates all present players' cards
  **server-side in one call** - no more N browser requests with partial
  failures), `get`, `editContent` (propagation, replacing batchGroupId),
  `complete` (rolls up outcomes, carry-forward, marks missed). `BE`
- [ ] `CL_Mark_Attendance` + `CL_Get_Attendance` read/write via ClassSession
  for batch flows (single source of truth; the admin calendar reads the same
  data the coach wrote). `BE`
- [ ] Frontend Class Room + BatchDetail Sessions tab switch to ClassSession
  APIs. `batchGroupId` kept read-compatible for old cards. `FE+BE`
- [ ] Backfill script: derive historical ClassSessions from existing
  attendance records + cards (best effort, for the Sessions tab history). `BE`

### Phase 4 - Round it out
- [ ] **Pathway tabs** on Past Sessions & Player page (group cards by
  `card.LearningPathway` - data already there). `FE`
- [ ] **Multi-pathway enrollment** (`enrollments[]` per player, own counter
  each) - the real dual-pathway/summer-camp fix. `FE+BE`
- [ ] Batch progress report (per-batch: sessions done, attendance %, points). `FE`
- [ ] Reconcile `Players` vs `Users` collection usage across Lambdas. `BE`

---

## 8. What gets DELETED (removal is the feature)

- Admin **Attendance** page (3 tabs) - absorbed into Batch + Player pages
- Admin **Session Card Management** page - absorbed into Batch + Player pages
- Admin **Manage Batches** page - becomes the Batches hub (list + detail)
- Coach **Start Session** page - replaced by Today + My Batches
- The **duplicate delete-modal** in SessionCardManage
- Raw status strings in UI (`upcoming`, `pending`, `in progress`, …) - replaced
  by the 4-word vocabulary
- The mental concept of "generating a card" from the coach's world entirely

---

## 9. Guardrails (so it never gets tangled again)

1. **One home per job.** If a task can be done in two places, one of them is a bug.
2. **Batch questions → Batch page. Player questions → Player page.** No third place.
3. **Coaches coach; the system clerks.** Any flow requiring a coach to know an
   internal status or trigger generation manually is a defect.
4. **Exceptions are fixed where they're seen** - a ⚠ row always carries its own Fix action.
5. **Four visible statuses.** Adding a fifth requires deleting one.
6. **New feature? It must name its home page before it's built.**

---

## 10. Acceptance checklist (user POV - this defines "perfect")

- [ ] A brand-new coach can run their first class with **zero training** beyond
      "tap today's class".
- [ ] Coach runs a full class (attendance → coach → finish) in **one screen**,
      ≤ 3 decisions before coaching starts.
- [ ] Admin can answer *"how is Batch X doing?"* from **one page** in < 10 seconds.
- [ ] A missed kid **never blocks** anyone - not the batch, not themselves; the
      make-up path is one visible click.
- [ ] Attendance written by the coach and read by the admin is **always identical**
      (same record, not reconciled copies).
- [ ] Every card shows session **number + date**; nowhere in the code guesses them.
- [ ] Editing this week's content once updates the **whole class**, without
      touching any kid's ratings.
- [ ] Summer-camp kids: each pathway has its **own counter and its own tab**.
- [ ] The word "batch" gives nobody a headache.
