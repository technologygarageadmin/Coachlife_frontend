# CoachLife Performance: Caching & Request Batching

What was slow, what changed, and — most importantly — **how the app avoids showing you stale
data after you edit something.**

---

## 1. What was making it slow

Every page fetched its own data on mount, and nothing was shared between pages. Three patterns
dominated the wait time.

### A. The Learning Pathway catalog was re-downloaded constantly

Six pages each did a full `GET CL_Get_LearningPathway` — the **entire** curriculum, every session
with every activity, story text and code samples included — usually just to find one session.

| Page | Why it downloaded the whole catalog |
|---|---|
| Learning Pathway Builder | To list sessions |
| View Pathway | To find **one** session by id |
| Edit Pathway | To find one session **and** to fill the import picker |
| Add Pathway | To list pathway names + the import picker |
| Custom Card Generate | To browse sessions |
| Edit Session Card | For the import picker |

Edit Pathway fetched it **twice on a single page load** — two identical requests, in parallel, for
the same bytes.

### B. Session cards were read one request at a time

`CL_View_Sessioncard` was called once per card:

| Page | Pattern | Cost for a coach with 8 players × 10 cards |
|---|---|---|
| Past Sessions | one request per card, all players | **80 requests** |
| Coach Dashboard | same, throttled to 5 at a time with retries | 80 requests, queued |
| Session Card Management | one per card, **sequential `await`** | 10 requests, back-to-back |
| Player Sessions / Player Detail | one per card | 10 requests |
| Batch views | one per card, per player | 80 requests |

The Coach Dashboard had grown a concurrency-limited worker pool with retry-and-backoff logic
specifically because firing them all at once made the Lambda throttle and silently drop cards.
That complexity was treating the symptom.

A **bulk** form of the endpoint — `{ sessionCardIds: [...] }` returning all cards in one response —
already existed and was being used in exactly one place.

### C. Batches and rewards refetched on every mount

`CL_Get_Batches` from six pages, `CL_View_Reward` from two. Data that changes maybe once a week.

---

## 2. What changed

Two new files hold all of it:

| File | Role |
|---|---|
| `frontend/src/utils/apiCache.js` | Generic TTL cache, in-flight de-duplication, optional `sessionStorage` persistence |
| `frontend/src/utils/dataService.js` | One cached loader per resource + the matching `invalidate*` helpers |

Every page now calls a loader instead of writing its own `fetch`. **Net −338 lines across 23 files**,
even after adding both new files.

### Three mechanisms

**1. TTL caching.** A response is reused until it is older than its time-to-live.

**2. In-flight de-duplication.** Two components asking for the same thing at the same moment share
one network call. This alone fixed Edit Pathway's double-fetch — no page changes needed, the second
request simply joins the first.

**3. Request batching.** `getSessionCards(ids)` sends **one** bulk call for all uncached ids instead
of one call per card. If the bulk response omits any id, it falls back to individual requests for
just those — so a backend that doesn't support the bulk shape degrades to the old behavior rather
than breaking.

### TTLs, chosen per how volatile the data actually is

| Data | Cached? | TTL | Reasoning |
|---|---|---|---|
| Learning Pathway | Yes, **survives page reload** | 15 min | Only changes when an admin edits a session |
| Batches | Yes | 5 min | Occasional admin changes |
| Rewards | Yes | 5 min | Occasional admin changes |
| Session cards (by id) | Yes | 2 min | Coaches mutate these during a live session |
| Each player's **current** card | **No** | — | Decides what "Generate next" does; must be true |
| The card open in Session Detail | **No** | — | It is being edited right now |
| Attendance records | **No** | — | Changes constantly during a class |
| Leaderboard | **No** | — | Already has its own 10-minute refresh |

The Learning Pathway is the only one persisted to `sessionStorage`, so it survives a browser
refresh (per tab). It is also the largest payload and the least volatile — the best possible
caching candidate.

### Measured effect on request counts

| Action | Before | After (cold) | After (warm) |
|---|---|---|---|
| Open Edit Pathway | 2 full catalogs | 1 | 0 |
| Navigate Builder → View → Edit | 4 full catalogs | 1 | 0 |
| Past Sessions, 8 players × 10 cards | 80 requests | 1 | 0 |
| Session Card Mgmt, one player, 10 cards | 10 **sequential** | 1 | 0 |
| Coach Dashboard | 80 pooled + retries | 1 | 0 |
| Revisit any of the above within TTL | full refetch | — | **0** |

"Warm" means within the TTL and with no intervening edit.

---

## 3. Your question: "If I modify data, will it not refresh?"

This is the right thing to worry about — it is the classic caching bug. Here is how it is handled.

### The rule: every write invalidates what it wrote

Caching alone *would* show you stale data. The cache is therefore paired with explicit
invalidation. Whenever the app writes something, it deletes the matching cache entry, so the very
next read goes back to the API.

```js
// Pattern used everywhere a write happens
await fetch(UPDATE_SESSION_CARD, { ... });   // 1. write to the server
invalidateSessionCard(cardId);               // 2. drop the cached copy
// 3. any page reading this card now re-fetches it
```

**A write with no matching `invalidate*` call is a stale-data bug.** That rule is written into
`CLAUDE.md` so it is applied to future changes too.

### Every write path, and what it clears

| You do this | Cleared automatically |
|---|---|
| Add / edit / delete / rename a pathway session | The whole pathway catalog |
| Generate a session card (single, batch, or custom) | All cached cards |
| Edit a session card | That card — or **all** cards, if "apply to batch" was used |
| Delete a session card | That card |
| Start a session | That card |
| Complete a session | That card |
| Mark a home task done | That card |
| Regenerate a story / instructions / code section | That card |
| Edit the WhatsApp feedback message | That card |
| **Mark attendance** (coach or admin, single, bulk, or reset) | All cached cards |
| Create / update / delete a batch, assign or remove a coach or player | The batch list |
| Add / edit / delete a reward | The reward list |
| Log in or log out | **Everything** |

The attendance rows deserve a note. Marking attendance looks like it only touches attendance
records, but the backend also moves the session card — absent makes the card *pending*, present can
restore an *upcoming* card. So attendance writes clear cached cards too. **This was a genuine gap
found while re-auditing the write paths, and it is now fixed** in the coach's Class Room, the
admin Attendance page (bulk save, mark-all-present, delete, and per-player override) and the Batch
Detail attendance tab.

### Cases the cache deliberately never touches

Some data is too important to ever serve from cache, so it is always read live:

- **The card you are working on in Session Detail.** It is read fresh every time. Session Detail
  only ever *writes* to the cache by invalidating.
- **Each player's current card.** This drives what "Generate next session" will do. A stale answer
  here would generate the wrong session number, so it is always a live call.
- **Attendance records**, and the player list after generating a card.

### A failed read is never cached

If a card request fails — a timeout, a throttle, a blip — the failure is **not** stored. Otherwise
one transient error would hide a real card from every page for the full two minutes. The next view
retries it.

### The one case that is genuinely not covered

**Another person editing the same data at the same time.** If a second admin edits a pathway
session while your tab already has the catalog cached, you will not see their change until your
15-minute TTL expires or you log out and back in.

This is a deliberate trade-off, and the TTLs were picked with it in mind:

- Your **own** edits always show immediately — that is what invalidation guarantees.
- Data that two people might touch during one session (session cards) has a **short** 2-minute TTL.
- Data with a long TTL (the pathway catalog) is the data that is edited rarely, by one admin at a
  time.

If simultaneous multi-admin editing becomes common, the fix is either to lower the pathway TTL or
add an explicit "Refresh" button — every loader already accepts `{ force: true }` to bypass the
cache, so the wiring is in place.

---

## 3b. Bug found while auditing: missing cards in the By Batch view

Some players (Praneeth, Shrivartan) showed **no session cards** in Session Card Management →
By Batch, while the same player's profile page showed them normally.

**Cause — not the cache.** `CL_Get_All_Players` returns a player's card references in *two*
different shapes:

| Shape | Value |
|---|---|
| `sessionCardIds` | `["6712ab...", "6712cd..."]` — id strings |
| `sessionCards` | `[{ sessionCardId: "6712ab...", ... }]` — full card objects |

The Zustand store handled both. Session Card Management had its **own** copy of the player fetch
that only handled the first (`p.sessionCardIds || []`), so players on the second shape came back
with an empty id list — and the app then correctly fetched *zero* cards for them. The profile route
reads players through the store, which is why the same player looked fine there.

**Fix.** One shared `normalizeSessionCardIds(player)` in `utils/dataService.js`, now used by the
store and by every place that reads ids off a raw API response: Session Card Management,
Custom Card Generate, Leaderboard, Batch Session View, My Players, Start Session, Player Sessions.

This was pre-existing, not introduced by the caching work — the store's dual-shape handling shows
someone hit this before and fixed it in only one of the two paths.

---

## 4. How to verify it

**That it is faster** — open DevTools → Network, then navigate
Learning Pathway Builder → View a session → Edit that session. You should see the catalog fetched
**once**, not four times. Open Past Sessions and you should see one `CL_View_Sessioncard` call, not
one per card.

**That edits still refresh** — the cases worth clicking through:

1. Edit a pathway session → save → the Builder list shows the new text immediately.
2. Generate a card for a player → it appears in their card list immediately.
3. Complete a session as a coach → it shows as completed in Past Sessions immediately.
4. Mark a player absent → their card shows as pending in the Sessions view immediately.
5. Delete a card → it disappears (as an "empty" tombstone) immediately.
6. Add a reward → it appears in the Rewards list and the Redeem dropdown immediately.

---

## 5. Status

`npm run build` passes. `npm run lint` reports 27 errors, all of which pre-date this work
(`'pal' is assigned but never used`, `'Icon' is defined but never used`, and similar) — none are in
the new code. One new lint *warning* was added (an exhaustive-deps note in `StartSession`),
consistent with the ~14 already present.

**Not yet run against the live APIs.** The bulk `{ sessionCardIds: [...] }` call is the shape
already used in production by the batch card view, and the per-card fallback covers a backend that
rejects it. The six checks in section 4 are the ones to run first.
