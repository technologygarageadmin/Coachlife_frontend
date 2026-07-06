# CoachLife - Batch, Attendance & Session-Card Fix Plan

> Goal: make the Batch → Attendance → Session-Card → Completion flow reliable and
> satisfying for coaches and admins. This document is the single source of truth
> for the rework. Check items off as they ship.

## Shipped so far

The core unblock + propagation slice is implemented in code (backend Lambda source
edited in [backend/](backend/); **not yet deployed to AWS** - each edited Lambda
folder must be redeployed before these fixes take effect in production):

- [x] **#1 Missed-session block** - `CL_Complete_Session` no longer requires every
      activity to have rating+feedback; an activity can be marked `not_completed`
      and the session still finishes. `CL_Generate_session_card` carries forward
      any `not_completed` activity onto the player's next card instead of
      silently dropping it.
- [x] **#2 Batch-from-pathway sourcing** - `Batch` now has a `LearningPathway`
      field (`CL_Manage_Batch`, `CL_Get_Batches`); batch-generate passes it to
      `CL_Session_Card_Generating`, which uses it in place of the player's own
      profile pathway when supplied.
- [x] **#5 Session number + date on cards** - `CL_Generate_session_card` now
      writes `sessionDate` at creation (the `session` number field already
      existed). `BatchSessionView.jsx` and `Attendance.jsx` no longer guess the
      session number from `sessionCardIds.length` or attendance-history
      inference - they read the real stored value.
- [x] **#7 Per-activity not-completed + carry-forward** - done as part of #1
      above; `SessionDetail.jsx` has a Completed/Not Completed toggle per
      activity, comment becomes optional when not completed, points are only
      credited for activities actually completed.
- [x] **#9 (new) Batch-edit propagation** - `CL_Update_Session_Card` gained an
      `applyToBatch` mode: cards generated together share a `batchGroupId`;
      editing one and checking "apply to batch" propagates Topic/Objective/
      activities to every sibling card while preserving each student's own
      rating/feedback/status (including their personal carried-forward items).
      Wired into `EditSessionCard.jsx` as a checkbox.
- [x] **Bug found + fixed in passing**: `CL_View_Sessioncard` only accepted
      `playerId`, but `StartSession.jsx`, `BatchSessionView.jsx`, and
      `SessionCardManage.jsx` all called it with `sessionCardId` - every such
      call was returning 400 in production. Now supports both.
- [x] **Batch-generate preview + per-player session pill** - `SessionCardManage.jsx`
      "By Batch" view now shows each player's real Session #/date/status (read
      from their live card, not guessed), an **Edit** link to their card, and a
      preview modal (topic/activities/points per player, or a red "Blocked"
      reason) before "Generate" actually commits. Fixed a related navigation bug:
      leaving `EditSessionCard.jsx` (save/cancel/back) previously dropped the
      admin back to the default "By Student" view instead of the batch they came
      from - now round-trips the `batchId` through route state.
- [x] **Editable `sessionDate`** - `CL_Update_Session_Card` and `EditSessionCard.jsx`
      now support changing a card's session date after generation (propagates to
      the batch group too, same as Topic/Objective, when "apply to batch" is checked).
- [x] **Auto-pending for hanging sessions** - if a player's last card was left at
      `upcoming`/`in_progress` (coach never submitted it) and generation is
      attempted, `CL_Generate_session_card` no longer blocks: it auto-closes that
      card as `pending` (same recoverable-miss status used for absent/excused)
      and generates the next one anyway. Every activity that wasn't explicitly
      `completed` on the abandoned card carries forward (broadened from just
      `not_completed` activities, since an abandoned card's activities may never
      have been touched at all). This means one stuck student in a batch no
      longer blocks that student from `Generate` - the whole batch always
      proceeds together.
- [x] **Session date is asked for before generating** - both the "Generate" button
      (in the preview modal) and the "Custom" button (in a new date-prompt modal)
      now ask for a session date before anything is created. `CL_Generate_session_card`
      and `CL_Generate_Custom_Session_Card` both accept an optional `sessionDate`
      override (the latter previously didn't write `sessionDate` **at all** - a
      second bug found in passing). The Custom lambda also gained `batchGroupId`
      support so custom-built batch cards are propagation-compatible too.
- [x] **#6 Staging/preview with editable activities, batch + player level** -
      clicking **Edit** on a preview row (batch view) or the new **Preview & Edit**
      button (single-student view) opens the existing Custom Card builder
      (`customCardGenerate.jsx`) **pre-loaded** with that player's real next
      pathway session (Topic/Objective/activities/takeaways) instead of starting
      from scratch. Each activity in the builder now has a real **Edit** button
      opening an editable form - previously that page only had a read-only "view
      details" popup, no way to actually change an activity's content before
      creating the card. This is the lighter-weight version of the originally
      planned drag-and-drop staging area: modify-before-create now works, full
      reordering-while-staging does not (existing up/down buttons still work).
- [x] **Replaced the one-off edit form with the real Learning Pathway activity
      editor** - `customCardGenerate.jsx`'s Edit button (and a new **Add
      Activity** button) now navigate to the same `ActivityEditor.jsx` page
      `AddPathway.jsx`/`EditPathway.jsx` already use: rich text description,
      structured story lines/coach instructions/AI tools/evaluation criteria
      with add-remove lists, project workflow steps - instead of a simpler
      textarea-based modal. `ActivityEditor.jsx` was changed to spread
      `...location.state` through both Save and Cancel so arbitrary caller
      context (player/batch/session-date/prefill) survives the navigate-away-
      and-back round trip untouched, not just the 3 fields the pathway pages
      use. `customCardGenerate.jsx` restores the edited activity list from
      `location.state.returnFormData` on return, with a guard so the original
      `prefill` step doesn't re-run and stomp the edit.
- [x] **Auto-pending now works live, without the container redeploy** - realized
      the currently-*deployed* (unmodified) `CL_Session_Card_Generating` already
      allows advancing past a `pending` card; only `upcoming`/`in_progress`
      blocks it, and this was true even before any of today's edits. So instead
      of waiting on the container rebuild, `CL_Update_Session_Card`'s status
      allowlist was extended to include `pending`/`not_completed` (zip-deployed,
      live now), and the batch preview modal auto-marks any hanging
      `upcoming`/`in_progress` card as `pending` right before calling Generate.
      Recoverable rows show amber (not red) in the preview and no longer disable
      "Confirm & Generate" - only genuinely unrecoverable rows (no pathway set,
      no pathway content) still block.
- [x] **Fixed: recoverable rows weren't showing their preview or Edit button** -
      they carried `topic`/`activityCount`/`points` in the row data but the JSX
      never rendered it, and only non-blocked rows got the Edit button. Both
      fixed - amber rows now show the same "Session N: Topic · X activities · Y
      pts" preview and Edit button as clean rows.
- [x] **Fixed: a card could be shown as "recoverable" with no content to advance
      into** - `getNextSessionPreview` checked "is the current card hanging" before
      "does the next session even have pathway content", so a player could show
      amber/enabled with an empty preview, only to fail with a confusing error
      when actually generated or staged. Missing pathway content is now always a
      hard block (red), checked first, with a message telling you exactly what's
      missing (e.g. `Session 3 has no pathway content yet - add it to "AI
      foundation for kids" first`) instead of a generic "No generatable session
      found" surprise.
- [x] **"Edit This Session for the Whole Batch"** - new button in the preview
      modal, above the player list. Opens the same staging editor pre-loaded with
      one shared Topic/Objective/activities template (from the first generatable
      player), but in **batch mode**: editing it once and creating applies to
      every player in the batch via the existing `runBatchGenerate` loop in
      `customCardGenerate.jsx`. Any player whose last card was hanging at
      upcoming/in_progress is auto-marked `pending` first, for all of them, not
      just one. Also fixed `runBatchGenerate` to use the shared staged pathway
      for every player instead of each player's own individual profile pathway
      (which is only correct for a from-scratch custom build, not a
      pathway-sourced staged edit).

**Not yet done** (still real work, tracked in §5 below): #3 attendance-driven
"Start Session" as one merged action (still two separate steps today, though
attendance now reads the correct session number), #4 multi-pathway enrollment
for dual-pathway/summer-camp kids, #8 pathway tabs in PastSessions, and full
drag-to-reorder while staging (up/down buttons work, native drag reordering
doesn't). The `#9` fix above is a lighter-weight `batchGroupId` mechanism, not
the full `BatchSession` object described in §3.3 - that remains the
longer-term target if a real shared "session instance" is needed for more than
content propagation.

> ⚠️ **Two Lambdas are container images, not zip-deployable**: `CL_Session_Card_Generating`
> (source: `backend/CL_Generate_session_card/app.py`) and `CL_Custome_Sessioncard`
> (source: `backend/CL_Generate_Custom_Session_Card/code.py`). Both need a Docker
> rebuild + push, not the `aws lambda update-function-code --zip-file` method used
> for everything else. Neither has been deployed by me - both need a manual
> container redeploy to go live.

---

## 1. Diagnosis - why it hurts today

Almost every reported defect traces back to **4 root causes**. Fix these and most of
the symptom list disappears.

| # | Root cause | Symptoms it produces |
|---|-----------|----------------------|
| **A** | **No "session instance" object.** A card is per-player; nothing ties `{batch + date + session number + attendance + each player's card}` together. | Attendance & session-start are disconnected; batch has to *guess* what session it's on; can't propagate a batch edit to all students. |
| **B** | **Session number is inferred, never stored.** `sessionCardIds.length` in one place ([BatchSessionView.jsx:118](frontend/src/pages/coach/BatchSessionView.jsx#L118)), a 4-level fallback chain in another (`resolveSessionNumber`, [Attendance.jsx:553](frontend/src/pages/admin/Attendance.jsx#L553)). They disagree. | Ambiguous session #/date on cards; wrong numbers for missed sessions. |
| **C** | **Generation keys off the player's single `LearningPathway` profile string** and always advances "next sequential" by count (`CL_Session_Card_Generating` takes only `{ playerId }`). | Individual generation can't inherit a batch pathway; dual-pathway / summer-camp kids cram two curricula into one field → start error; completed sessions can't be split by pathway. |
| **D** | **"Not completed" is not modeled** at session or activity level. Card status is only `Draft / In Progress / Completed`. Absent/incomplete leaves a card sitting; next generation advances anyway. | Missed-session block with no remap; no carry-forward / to-go; no per-activity not-completed. |

---

## 2. Requirement → root cause → fix map

| Requirement | Root cause | Fix summary |
|---|---|---|
| 1. Fix missed-session block: unblock & remap the card | D + B | Add `Not Completed` session status (still submittable); do **not** advance counter on a miss; remap the same session number forward. |
| 2. Batch-from-pathway sourcing (individual gen inherits from batch) | C + A | Batch owns a `LearningPathway`; generation (batch **and** single-player) inherits it. |
| 3. Attendance-driven start (batch-level "Start Session" at attendance step) | A | Merge attendance + start into **one** batch action. |
| 4. Fix summer-camp start error for dual-pathway kids | C | Player becomes **multi-enrollment**; each pathway has its **own** counter. |
| 5. Add session number + clear date to cards | B | Write `sessionNumber` + `sessionDate` **once, at generation**; stop inferring. |
| 6. Staging/preview with modify-before-create + drag-drop (batch & player) | (immediate commit) | Extend `customCardGenerate` into the default **preview-before-create** path. |
| 7. Per-activity "not completed" + optional feedback, session still completable, carry-forward | D | Activity gains `status`; session completes regardless; not-done activities carry forward as "to-go". |
| 8. Categorize completed sessions into tabs by pathway | C | Group by `card.LearningPathway` (already stored); reliable once enrollment is multi-pathway. |
| **9. NEW - editing a batch student's card reflects in all other students** | **A** | Split **shared card content** (one per batch session) from **per-student progress** (ratings/feedback/attendance). Editing the shared content propagates automatically. |

---

## 3. Target data model

### 3.1 Batch (add a curriculum)
```js
Batch {
  batchId, batchName, playerIds[], coachIds[], days[], startTime, endTime,
  LearningPathway: string          // NEW - the curriculum this batch runs
}
```

### 3.2 Player (multi-pathway enrollment)  - fixes #4, #8
```js
Player {
  ...existing,
  // Replace the single `LearningPathway` string with:
  enrollments: [
    { LearningPathway: string, currentSession: number, status: 'active'|'paused'|'done' }
  ]
  // Keep `LearningPathway` as a computed "primary" for backward compat during migration.
}
```

### 3.3 BatchSession - the missing instance object (root cause A) - fixes #3, #5, #9
```js
BatchSession {
  batchSessionId, batchId, LearningPathway,
  sessionNumber,                    // written ONCE at creation
  sessionDate,                      // written ONCE at creation
  status: 'draft'|'in_progress'|'completed'|'not_completed',

  // SHARED content - one copy for the whole batch. Editing this = edits for everyone (#9)
  content: {
    Topic, Objective,
    activities: Activity[],         // the template every student runs
    sessionTakeaways[]
  },

  // PER-STUDENT progress - never shared
  players: [{
    playerId, playerName,
    sessionCardId,                  // link to the student's card record
    attendanceStatus: 'Present'|'Absent'|'Late'|'Excused'|'',
    outcome: 'completed'|'not_completed'|'',
    carryForward: Activity[]        // activities to prepend to this student's NEXT card
  }]
}
```

### 3.4 Session Card (per student) - add stored fields
```js
SessionCard {
  ...existing,
  sessionNumber,                    // NEW - copied from BatchSession, not inferred (#5)
  sessionDate,                      // NEW - copied from BatchSession (#5)
  batchSessionId,                   // NEW - link back to the shared content (#9)
  LearningPathway,                  // reliable tag for pathway tabs (#8)
  status: 'draft'|'in_progress'|'completed'|'not_completed',   // + not_completed (#1)
  activities: [{
    ...existing,
    status: 'completed'|'not_completed'|'',   // NEW per-activity state (#7)
    feedback, rating              // stays per student
  }]
}
```

---

## 4. The new/target flow

**Setup (Admin)**
1. Create batch → now also pick a **Learning Pathway** for the batch.

**Run a batch session (Coach) - one merged screen (#3)**
2. Open batch → **Mark attendance** (Present/Absent) → press **Start Session**.
   - System creates/loads the `BatchSession` for today: `sessionNumber` + `sessionDate`
     stamped once (#5); shared `content` sourced from the batch pathway (#2).
   - **Present** players get a card linked to the shared content.
   - **Absent** players are recorded as a miss; their counter does **not** advance (#1).

**Edit content (Admin/Coach) - propagates (#9)**
3. Editing the batch session's `content` (drag-drop reorder, add/remove activity) updates
   the **one shared copy** → every student in that batch sees it. Ratings/feedback stay
   per student because they live on each student's card, not on `content`.

**Complete (Coach)**
4. In `SessionDetail`, rate/feedback per activity. Mark any activity `not_completed`.
   Submit works even with some not done. Session → `completed` or `not_completed`.
   Not-completed activities → `carryForward` → prepended to that student's **next** card (#7).

**Review (Admin/Coach)**
5. `PastSessions` groups completed cards into **tabs by `LearningPathway`** (#8).

**Preview before commit (#6)**
6. Generation writes a **draft** `BatchSession.content` into a staging area. Admin
   reorders/edits (drag-drop) at **batch level** (shared) or **player level** (override a
   single student) **before** pressing **Create**.

---

## 5. Build order (each step ships value)

Legend: `FE` = frontend only · `BE` = needs AWS Lambda change · `FE+BE` = both.

- [x] **Step 1 - Stamp `sessionNumber` + `sessionDate` on the card (#5).** `FE+BE` - **shipped, not yet deployed**
      `CL_Generate_session_card` writes `sessionDate`; `BatchSessionView.jsx`
      and `Attendance.jsx` read the real stored value instead of
      `ids.length`/history-inference guesses.
- [x] **Step 2 - Add `LearningPathway` to batches + pass into generation (#2).** `FE+BE` - **shipped, not yet deployed**
      `ManageBatches` form has a pathway select; batch-generate in
      `SessionCardManage.jsx` passes it through.
- [ ] **Step 3 - Merge attendance + start into one batch action (#3).** `FE` first, `BE` for BatchSession.
      Still two separate steps in `BatchSessionView` today. Not done this pass.
- [x] **Step 4 (lite) - Batch content propagation (#9).** `FE+BE` - **shipped, not yet deployed**
      Implemented via a shared `batchGroupId` tag on cards generated together +
      an `applyToBatch` mode on `CL_Update_Session_Card`, rather than the full
      `BatchSession` object in §3.3. Sufficient for "edit propagates to the
      batch"; does not yet give attendance/start a shared instance to read from
      (that's still Step 3).
- [x] **Step 5 - `Not Completed` + per-activity status + carry-forward (#1, #7).** `FE+BE` - **shipped, not yet deployed**
      `CL_Complete_Session` per-activity status + `CL_Generate_session_card`
      carry-forward + `SessionDetail.jsx` toggle UI.
- [ ] **Step 6 - Multi-pathway enrollment (#4) + pathway tabs (#8).** `FE+BE`
      Not done this pass. `LearningPathway` is still a single profile string.
- [ ] **Step 7 - Staging/preview with drag-drop (#6).** `FE` (reuse `customCardGenerate`).
      Not done this pass.

> ⚠️ **Deploy reminder:** the backend IS in this repo under [backend/](backend/) as
> individual Python Lambda functions, and every `BE` step above only edited that
> source. None of it is live until each changed Lambda folder
> (`CL_Complete_Session`, `CL_Generate_session_card`, `CL_View_Sessioncard`,
> `CL_Manage_Batch`, `CL_Get_Batches`, `CL_Update_Session_Card`) is redeployed to
> AWS. See §6.5 for the exact files and edits per step.

---

## 6. API contracts to add / change (for the backend team)

```
POST CL_Session_Card_Generating
  in : { playerId, LearningPathway?, sessionNumber?, batchSessionId? }
  out: { sessionCardId, sessionNumber, sessionDate, LearningPathway, status }
  rule: if carryForward exists for player+pathway, prepend it; advance counter ONLY on completion.

POST CL_Manage_BatchSession            // NEW
  actions:
    start   { batchId, sessionDate, attendance:[{playerId,status}] } -> creates BatchSession, cards for Present
    editContent { batchSessionId, content }                          -> updates SHARED content (propagates, #9)
    overridePlayer { batchSessionId, playerId, activities }          -> per-student override
    complete { batchSessionId }                                       -> rolls up outcomes + carryForward

POST CL_Mark_Attendance
  add: sessionNumber + sessionDate come FROM the BatchSession (stop guessing).

POST CL_View_Sessioncard
  return: sessionNumber, sessionDate, batchSessionId, LearningPathway, per-activity status.
```

---

## 6.5 Backend edit plan (files live in [backend/](backend/))

All Lambdas are Python + `pymongo` against MongoDB db **`CoachLife`**. Each folder is a
separate AWS function - **edit + redeploy each one**.

> ⚠️ **Field-name reality check (verified in code):**
> - The card's session **number** is already stored as **`session`** (not `sessionNumber`)
>   in `SessionCards`. There is **no `sessionDate`** today - only `createdAt`.
>   So Step 1 = *add `sessionDate`*, not add the number.
> - `CL_Generate_session_card` reads the **`Players`** collection; `CL_Manage_Batch`
>   reads **`Users`**. Reconcile which collection is source-of-truth before Step 6.

| Step | File(s) to edit | Concrete change |
|---|---|---|
| **1** (#5) | [backend/CL_Generate_session_card/app.py](backend/CL_Generate_session_card/app.py) `insert_one` (~L117-133) · [backend/CL_View_Sessioncard/lambda_function.py](backend/CL_View_Sessioncard/lambda_function.py) | Add `"sessionDate"` to the inserted card (default = today IST). Return `session` + `sessionDate` from View. FE: stop computing `ids.length` in [BatchSessionView.jsx:118](frontend/src/pages/coach/BatchSessionView.jsx#L118) and drop the `resolveSessionNumber` chain in [Attendance.jsx:553](frontend/src/pages/admin/Attendance.jsx#L553). |
| **2** (#2) | [backend/CL_Manage_Batch/lambda_function.py](backend/CL_Manage_Batch/lambda_function.py) `create`/`update` (L116-165) · [backend/CL_Get_Batches/lambda_function.py](backend/CL_Get_Batches/lambda_function.py) | Persist + return `LearningPathway` on the batch. `CL_Generate_session_card`: accept optional `LearningPathway` in body and use it over `player["LearningPathway"]` (app.py L51). |
| **3** (#3) | **NEW** `backend/CL_Manage_BatchSession/` · reuse [backend/CL_Start_Session/lambda_function.py](backend/CL_Start_Session/lambda_function.py) · [backend/CL_Mark_Attendance/lambda_function.py](backend/CL_Mark_Attendance/lambda_function.py) | New `BatchSessions` collection + handler (`start`/`editContent`/`overridePlayer`/`complete`). `start` stamps `session`+`sessionDate` once and creates cards for Present players. Mark_Attendance reads number/date from the BatchSession instead of guessing. |
| **4** (#9) | **NEW** `CL_Manage_BatchSession` `editContent` · [backend/CL_Update_Session_Card/lambda_function.py](backend/CL_Update_Session_Card/lambda_function.py) | Store shared `content` on the BatchSession; student cards carry `batchSessionId` + read content from it. `editContent` updates the one shared copy → propagates. Add `overridePlayer` for a single-student exception. |
| **5** (#1, #7) | [backend/CL_Generate_session_card/app.py](backend/CL_Generate_session_card/app.py) (L62-71) · [backend/CL_Complete_Session/lambda_function.py](backend/CL_Complete_Session/lambda_function.py) · [backend/CL_Regenerate_session_card/app.py](backend/CL_Regenerate_session_card/app.py) | Add `not_completed` status + per-activity `status`. In generate: **do not advance** when last card is `absent`/`excused`/`not_completed`; prepend that card's `carryForward` activities. In complete: roll up not-done activities into `carryForward` and only advance the counter on real completion. |
| **6** (#4, #8) | [backend/CL_Add_Players/lambda_function.py](backend/CL_Add_Players/lambda_function.py) · [backend/CL_Update_Player/lambda_function.py](backend/CL_Update_Player/lambda_function.py) · [backend/CL_Get_All_Players/lambda_function.py](backend/CL_Get_All_Players/lambda_function.py) · `CL_Generate_session_card` | Migrate player `LearningPathway` string → `enrollments[]` (each with own `currentSession`). Generation requires an explicit pathway when a player has >1 active enrollment. Write a one-off backfill script. |
| **7** (#6) | Frontend only - extend [customCardGenerate.jsx](frontend/src/pages/admin/customCardGenerate.jsx) | No backend change; generation writes a draft to the staging UI, "Create" calls the existing generate/custom endpoints. |

**New Lambda to scaffold:** `backend/CL_Manage_BatchSession/` (mirror the structure of
`CL_Manage_Batch`: `lambda_function.py` + `requirements.txt`, same CORS + `validate_user`
helpers). This is the object that fixes root causes A + B and powers Steps 3, 4, 5.

---

## 7. Recommendations (beyond the reported issues)

1. **Single source of truth for "current session #" = the enrollment counter**, advanced
   only on completion. Delete every `sessionCardIds.length` heuristic - they are the
   direct cause of the ambiguity.
2. **Separate "content" from "progress" everywhere.** This one split fixes propagation (#9),
   makes carry-forward clean (#7), and lets you regenerate/repair a card without losing a
   student's ratings.
3. **Idempotent "Start Session".** Starting the same batch+date twice must return the
   existing `BatchSession`, never create duplicates. Today attendance can double-write.
4. **Optimistic UI + refetch** on batch actions. Current code refetches everything
   (`refreshAfterChange`) on each mutation - fine for correctness, slow for coaches with
   large batches. Update local state first, reconcile after.
5. **Confirm before destructive propagation.** Since a batch-content edit now hits every
   student (#9), show "This will update N students" before saving.
6. **Guard the dual-pathway case explicitly.** When a player has >1 active enrollment,
   generation must require an explicit pathway (no silent "primary") to prevent the
   summer-camp error from recurring.
7. **Add an audit/version stamp** (`updatedBy`, `updatedAt`, `version`) to `BatchSession.content`
   so concurrent coach/admin edits don't clobber each other silently.
8. **Backfill migration script** for existing players: derive `enrollments[]` and per-card
   `sessionNumber`/`sessionDate` from history once, so old data renders correctly under the
   new model.
9. **Consolidate the two attendance surfaces** (`Attendance` admin page + `BatchSessionView`
   coach page) onto the same `BatchSession` read model so they can never disagree again.
10. **Remove the known duplicate delete-modal** in `SessionCardManage.jsx` while you're in
    there (noted in CLAUDE.md gotchas).

---

## 8. Definition of done

- [x] No code path computes a session number from array length. - fixed in
      `BatchSessionView.jsx` and `Attendance.jsx` (code done; needs the
      backend Lambdas above deployed to be true in production).
- [x] Every card shows an unambiguous session **number + date**. - `session`
      already existed; `sessionDate` now written at generation.
- [ ] Marking attendance and starting a batch session is **one** action. - not
      done this pass (Step 3).
- [x] Editing a batch student's card content updates **all** students in that
      batch; ratings/feedback stay per student. - shipped via `batchGroupId` +
      `applyToBatch` (lite version, not the full `BatchSession` object).
- [x] A missed/incomplete session does **not** advance the counter and carries
      forward. - `CL_Generate_session_card` now carries forward `not_completed`
      activities onto the next card.
- [x] A session can be submitted with some activities marked **not completed**.
      - `CL_Complete_Session` + `SessionDetail.jsx` toggle.
- [ ] Dual-pathway (summer camp) players can start sessions without error. -
      not done this pass (Step 6, multi-pathway enrollment).
- [ ] Completed sessions are grouped into **tabs by learning pathway**. - not
      done this pass (Step 6/8).
- [ ] Generation shows a **preview** that can be edited (drag-drop) before
      commit. - not done this pass (Step 7).
