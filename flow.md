# CoachLife - Corrected Flows

> The authoritative model is *"New Session Generation & Pending Flow"*. This doc
> is the implementation of that spec, and how each flow works in the app now.
>
> **Two hard rules from the spec drive everything:**
> 1. **Admin generates sessions. Coach does NOT.** The coach only starts class,
>    marks attendance, coaches, and completes pending sessions.
> 2. **Every session is kept whole and separate - never merged, never lost.** A
>    missed/unfinished session stays **Pending** as its own session and waits in
>    the coach's **Pending Queue** until completed. A student can have many.
>
> ⚠️ **Deploy note:** `CL_Session_Card_Generating` is a **container-image Lambda**.
> The "keep sessions whole (no carry-forward)" correction and session-date
> stamping only go live once that image is redeployed.

---

## The two status axes (independent)

**Session Status** - one of exactly four, shown by `StatusBadge`:

| Status | Meaning |
|---|---|
| **Upcoming** | Session generated, waiting to start |
| **In Progress** | Coach started coaching |
| **Completed** | Session finished successfully |
| **Pending** | Session was missed or not completed → waits in the queue |

**Attendance Status** - separate, per class day:

| Status | Meaning |
|---|---|
| Present / Absent / Late / Excused | Did the student attend |

> They are **independent fields**. A student can be `Attendance = Absent` while
> that session is `Session Status = Pending`. Marking a student **Absent** is the
> one link: it flips their card to **Pending** automatically (never deletes,
> never regenerates, never blocks).

---

# 1. Batch Flow  *(Admin)*

```
Sidebar "Batches" → /admin/manage-batches  (grid of batch cards)
  "New Batch" → assign: name · students · coach · learning pathway · schedule
      API: CL_Manage_Batch { action:'create', ... }
  → Save

  click a batch → /admin/batches/:batchId  (BatchDetail, 4 tabs)
    Overview   : roster + coach assign/remove
    Sessions   : each student's Session #/status + "Manage & Generate" (Flow 3)
    Attendance : admin can mark attendance for a date (same store as coach)
    Settings   : edit schedule/pathway/players · delete
```
Batch progression is **independent** of student completion - the batch moves to
its next weekly session regardless of anyone's pending backlog.

---

# 2. Session Generation Flow  *(Admin only)*

```
Admin opens a Batch (Current Session : N) → "Generate Session"
  → for every active student:  CL_Session_Card_Generating { playerId, LearningPathway? }
```

### The generation rules  (never fails, never blocks)
```
For each student, look at their previous session:

  Completed     → generate next session
  Pending       → KEEP it pending, generate next session   (stays in the queue)
  In Progress   → convert it to Pending, generate next session
  Upcoming      → convert it to Pending, generate next session
```
The new card is a **clean copy of the next pathway session** - Session N+1, status
`Upcoming`, `sessionDate` stamped. **No activities are carried forward**; the
previous session keeps its own (unfinished) activities and stays Pending.

```
Example - Student had Session 5 Pending:
   Generate → Session 6 created (Upcoming)
            → Session 5 STILL Pending   ← preserved as its own session
```

Blocks only if there is genuinely no pathway content for the next session number.

### Where admin triggers it
- Batch → **Sessions** tab → "Manage & Generate Sessions" (`/admin/session-card`,
  batch view, with a preview + optional staging/custom editor)
- A single player: `/admin/player-detail/:playerId` → "Generate Next Session"

---

# 3. Attendance Flow

One store: the `Attendance` collection (`CL_Mark_Attendance` write, `CL_Get_Attendance` read).

```
Coach, at class start (main path - Flow 4):
   tick Present / Absent per student → Start Session
   → CL_Mark_Attendance per student

   side-effect (server): Absent / Excused  → that student's card → Pending
                         Present / Late     → restores a wrongly-pending card
```

Other views onto the same store:
- Admin, per batch : `/admin/batches/:batchId` → Attendance tab
- Admin, per player: `/admin/player-detail/:playerId` → Attendance History (read-only)
- Coach, mid-session: inside `SessionDetail`

---

# 4. Start Session / Class Flow  *(Coach)*

### 4a. Start a class
```
/coach  (Dashboard) → "Today's Classes" → Start Session
  → /coach/batch-session  (Class Room)

  STEP 1 - Roster:  tick Present / Absent → "Start Session"
  STEP 2 - Start Sessiondoes exactly TWO things:
             • saves attendance  (Absent → card auto-Pending, server-side)
             • opens the coaching view
           ⚠ it does NOT generate cards - admin already did that.
             A present student with no card shows "No card - ask admin".
  STEP 3 - coach:  present-player tabs → tap a name → their card (4c)
```

### 4b. coach a session  (SessionDetail)
```
Upcoming → (coach starts) → In Progress → (coach finishes) → Completed
                                                          ↘ Pending (if not fully done)

  Start   : CL_Start_Session { sessionCardId }        → In Progress
  Work    : per activity - rate + comment, or mark "not completed"
  Finish  : CL_Complete_Session { card_id, activities_feedback[], rating, feedback }
              all activities completed        → Completed (points credited)
              some not completed / not taught → Pending  (stays in the queue)
```

### 4c. The Pending Queue  (Coach Dashboard)
```
Dashboard → "Pending Sessions" tile → the queue:

  Student   Batch     Session #   Pending Since   [ Start Session ]
  --------------------------------------------------------------
  John      Batch A   Session 4   2026-06-15      → opens the card
  David     Batch A   Session 2   2026-06-01      → opens the card
  Arun      Batch B   Session 5   2026-06-20      → opens the card

  sorted OLDEST session first (clear the backlog in learning order)
  a student can appear multiple times (multiple pending sessions supported)
```
Opening a queued row → `SessionDetail` (4b) → coach → Complete → it leaves the
queue. This is entirely independent of the batch's weekly progression.

---

## Student timeline example  (why nothing is lost)

```
Student A:  S1 Completed → S2 Completed → S3 Completed
Student B:  S1 Pending   → S2 Upcoming  → S3 Upcoming
            (B was absent for S1; admin still generated S2, S3)
            coach later opens S1 from the queue → Completed
            → B's history stays intact: S1 done late, S2/S3 continue
```

---

## The four flows, one line each

| Flow | One-liner |
|---|---|
| **Batch** | Admin: Batches → one batch = one page; batch advances weekly regardless of pending. |
| **Generation** | Admin only. Prev Completed→next; Pending→keep+next; In Progress/Upcoming→convert to Pending+next. Sessions kept whole, never merged. |
| **Attendance** | One store, many views; Absent auto-parks the card as Pending - never blocks, never deletes. |
| **Start Session** | Coach: Today's Class → Start Session(attendance only, no generation) → coach → Complete. Missed/unfinished → Pending Queue, cleared anytime. |

---

## What changed to match the spec  (correction log)

- **Removed activity carry-forward** from `CL_Generate_session_card` - the spec
  keeps each session whole; unfinished activities stay in *their own* Pending
  session, they are not merged into the next card.
- **Removed auto-generation from the coach's "Start Session"** - the coach no
  longer generates cards; Start Sessiononly saves attendance + opens coaching.
- **Built the real Pending Queue** on the Coach Dashboard - a flat, oldest-first
  list of individual pending *sessions* (Student · Batch · Session # · Since ·
  Start), each directly startable, replacing the old per-player count panel.
- **Aligned the status vocabulary** to the spec's four words -
  `Upcoming · In Progress · Completed · Pending` (was Scheduled/Done/Missed).
