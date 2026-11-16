# Cross-project context: CoachLife ⇄ Technology Garage

> **Keep this file identical in BOTH repos.** One copy lives at
> `/Users/tg/Desktop/CoachLife/CROSS_PROJECT.md`, the other at
> `/Users/tg/Desktop/TechnologyGarage/CROSS_PROJECT.md`.
> Two Claude sessions work on these projects (one per repo). This file is how they
> stay in sync. **If you change anything that touches the other project, update the
> Status + Change log below in BOTH copies before you finish.**
>
> Last updated: 2026-11-16 (Integration B: importer + auto-sync every 15 min + New players section with Add player / Dismiss / Undo; Add-to-batch still not built)

---

## 1. The two projects

| | CoachLife | Technology Garage (TG) |
|---|---|---|
| Folder | `/Users/tg/Desktop/CoachLife` (`frontend/`, `backend/`) | `/Users/tg/Desktop/TechnologyGarage` (`src/`, `backend/`) |
| What it is | Operations app for admins + coaches. Players, coaches, batches, session cards, rewards. | Public website, registration + Razorpay payments, and the **Leads CRM** (`/leads`) used by the marketing team. |
| Database | MongoDB `CoachLife` (collections `Users`, `Players`, `Batches`, `Slots`, ...) | MongoDB `Online_Session` (collection `Registration`) and `TG_Marketing` (leads, CRM users) |
| Login | `userToken` header, checked against CoachLife `Users` | Leads CRM: its own bearer token from `TG_Leads_Auth`, signed with `AUTH_SECRET` |
| Backend | AWS Lambda (Python), API Gateway, region `ap-south-1` | Same AWS account and region |

**Words to use.** In CoachLife the learners are called **Players** and the instructors **Coaches** (never "students"). In Technology Garage a registration is a *student/registration*. When a TG registration becomes a CoachLife record, call it a **Player** from then on.

Both are React + Vite frontends with Python Lambdas. Each repo has its own `CLAUDE.md`
with its own conventions - follow the one for the repo you are editing.

---

## 2. Integration A - Session Slots  (DONE, deployed)

**Purpose:** coaches give the times they can take new sessions. CoachLife stores
those open times. The **marketing team** (in the TG CRM) must be able to see which
times are free so they can offer one to a new lead on a call. The CRM only *shows*
availability; it never changes it.

**One API, two users:** `CL_Manage_Slots` Lambda
`https://zpmd0d7dwc.execute-api.ap-south-1.amazonaws.com/default/CL_Manage_Slots`
(source: `CoachLife/backend/CL_Manage_Slots/lambda_function.py`).

- Mongo collection `CoachLife.Slots`, documents by `type`:
  - `batch` - mirrored from `Batches` on every call (day, start, end, player count). **The `Slots` collection never stores a batch name.** (Names are added to the response only for a signed-in CoachLife admin - see below.)
  - `window` - an **open slot** coaches offer (day, start, end, optional `priority`: `preferred` / `alternative`).
  - `custom` - a **blocked** time (e.g. Break). Removes time from availability.
  - one settings doc `_id: "settings"` -> `maxStudentsPerBatch` (default 5, range 1-20).
- **Available slots** = open windows minus batch time minus blocked time, keeping only pieces of **60 minutes or more**. All times are **IST**, weekly recurring (no dates).
- CoachLife admin (`userToken`): `GET` list, `POST` `action` = `add` / `update` / `delete` / `settings` / `list` / `available`.
- **Names on the CoachLife schedule page (2026-11-17, user request):** `GET` list / `{action:"list"}` for a signed-in CoachLife admin now also returns, per batch slot, `batchName`, `players:[{playerId, playerName}]` and `coaches:[name]`, looked up live from `Batches` / `Players` / `Users` (never copied into `Slots`). A superAdmin sees all; a scoped admin only gets names for batches that hold at least one of their own assigned players, and only those players' names - every other batch comes back anonymous with `restricted:true` (counts only), same rule as `CL_Get_Batches`. **Search also needs batches that are not on the calendar:** the list response adds `unscheduled:[{batchId, batchName, players, coaches, playerCount}]` (batches that hold players but have no days / start time, so `Slots` has nothing for them) and `hiddenBatches` (how many batches were anonymised for a scoped admin), so the page can search every batch and explain why some are missing. **The CRM token path is unchanged: `?view=available` and nothing else, no names, no `unscheduled`.**
- **TG CRM** (Leads bearer token, verified with the shared `AUTH_SECRET` env var that is also set on `TG_Leads` / `TG_Leads_Auth`): **only** `GET ?view=available&minLength=60`. Everything else returns 403. Returns only `day, startTime, endTime, priority` - no batch, student or coach info. Forged / expired / missing token -> 401. If `AUTH_SECRET` is unset on the Lambda, CRM access is closed.

**Where it appears**
- CoachLife: sidebar **Session Scheduled** (renamed from "Session Slots" on 2026-11-17; route is still `/admin/session-slots`) -> `frontend/src/pages/admin/SessionSlots.jsx`. **Teams-style calendar**: week / work week / day time grid with Today, previous/next, a red current-time line, batch events coloured per batch showing **batch name, player names and seat count (n/max)**, open slots as dashed green, breaks hatched grey; clicking a batch opens a details card (schedule, coach, seat bar, player list, **Open batch** link). **Search box: finds a batch by name or a player by name and shows which batch that player is in.** The calendar stays on screen: while typing it **smooth-scrolls to the first matching batch**, pulses that batch's blocks, dims the others and marks the matched player's name inside the block (a short dropdown lists every match; clicking one scrolls to it; batches with no schedule show a details card instead). Also a Table view, Export CSV, Add/Edit slot slide-out, max-players-per-batch control and an "Add standard slots" seed. Batches still cannot be edited here; they come from the Batches page. In CoachLife we say **Players**, never "students".
- **Time zones (2026-11-17):** slot times are *stored* as IST weekday + HH:MM, but the schedule page *shows* them in the viewer's zone: **Auto** follows the computer's time zone (India -> IST; Chicago -> CST in winter / CDT in summer, picked per date), with manual **IST** / **CT (Chicago)** choices (kept in `localStorage` key `coachlife_schedule_tz`). Conversion uses the real date (`frontend/src/utils/timezone.js`), so an early-morning IST session lands on the *previous* day in Chicago and DST changes are handled. The Add/Edit slot form is always in IST. The Leads CRM panel still shows IST only - converting it is not done yet.
- TG CRM: **Available slots** button on the Leads toolbar -> slide-out `src/pages/Marketing/AvailableSlots.jsx` (wired in `Leads.jsx`). Read-only, fixed 60-minute slots, no copy button, no "next available" box (the user asked for these to be removed).

**Status (2026-11-16)**
- Lambda deployed and live; `AUTH_SECRET` copied to it from `TG_Leads` (never printed or put in code).
- CoachLife page works (tested with mocked API; dev server was on port 5174).
- TG CRM panel built and tested with mocked API; **CRM frontend is NOT built/deployed yet** and **nothing is committed in either repo**.
- No real open slots were saved to the live DB by Claude. The user adds them from the Session Slots page (**Add standard slots** button: weekdays 8-9 PM Preferred + 7-8 PM Alternative; Sat/Sun 11 AM-12 PM and 7-8 PM).

---

## 3. Integration B - Registration -> CoachLife  (PLANNED, NOT STARTED)

**Problem (user's words, cleaned up):** a student registers and pays on Technology
Garage. CoachLife never hears about them. We need to bring the registered student
into CoachLife, **let the coach know**, and have the coach/admin **check and put the
student into a batch - only if the payment succeeded.**

**Source data:** `Online_Session.Registration`. Fields: `name`, `parentName`, `phone`,
`age`, `isAdult`, `course` (`foundation` | `intermediate` | `advanced` | `tgsessions`),
`couponCode?`, `paymentMode` (`manual` | `autopay`), `status`, `razorpay_payment_id`,
`createdAt`. **Paid = `status == "success"`** (set by `TG_Verify` and `TG_Webhook`).
Failed/abandoned registrations are deleted by `TG_Create`, so pending rows can exist briefly.

**Proposed design (agreed direction, details still open):**
1. A new CoachLife Lambda **pulls** paid (`success`, not yet imported) registrations into a new CoachLife collection as a "new player, not yet in a batch". Each registration imported **once only** (keep the TG registration `_id` for de-dupe). **Do not modify the TG payment Lambdas** - they handle real money.
2. A **"New players" section on the existing Players pages** (NOT a separate page - user's decision) + a count badge on the Players sidebar item, so coaches/admins see them.
3. **Add to batch** action: creates the CoachLife player (what `CL_Add_Players` needs: `playerName`, `fatherName`/`motherName`, `phone`, `age`, `LearningPathway`, `primaryCoach`), then puts them in a batch that has room (respect `maxStudentsPerBatch`) via the existing batch logic. Only offered for paid students.

**User-confirmed facts (2026-11-16):**
- Technology Garage **only stores a registration; when payment succeeds that student is the paid student.** Paid = `status == "success"`.
- We must **get those paid students and store them in CoachLife, without storing anyone twice** ("with duplicate" in the user's message was read as a duplicate check: import each registration once and flag possible duplicates). Flagging, not blocking - the coach decides.

**Step 1 - import + duplicate check: BUILT AND DEPLOYED as Lambda `CL_Sync_Registrations`** (`CoachLife/backend/CL_Sync_Registrations/lambda_function.py`; python3.10, `LambdaExecutionRole`, env `MONGO_URI` only). **API route live: `https://5bfx0r5tcg.execute-api.ap-south-1.amazonaws.com/default/CL_Sync_Registrations`.** Tested with an in-memory DB; after deploy only token-less / bad-token calls were made (401). **It has never run a real sync**, so it is not yet confirmed that this Lambda's DB user can read `Online_Session.Registration`.
- Pulls paid TG registrations (read-only `find`, TG data is never written) into the new collection `CoachLife.NewPlayers`, **once per TG registration `_id`** (idempotent; re-running imports nothing new; a registration that turns paid later is picked up).
- Duplicate flag (`possibleDuplicate`): same name + phone as an existing CoachLife player; same phone as a player with a different name (sibling?); same name + phone as an earlier imported registration (e.g. a second course). Phones compared on the last 10 digits.
- Does **not** copy payment ids. Besides the fixed fields it copies these **optional** registration fields when they exist (matched case-insensitively): `fatherName`, `motherName`, `dateOfBirth`/`dob`, `address`, `alternativeNumber`, `LearningPathway`/`learningPathway`/`pathway`. **While a record is still `new`, every sync refreshes its descriptive fields from the registration** (so late-added fields and edits flow through); `placed` / `dismissed` records are never touched. TG dates look like `16-11-2026 22:15:09` (`%d-%m-%Y %H:%M:%S`, IST). `TG_Verify` also writes a real `paidAt` timestamp - not used (the UI shows the registration date as "Registered on"), available if wanted. Stores: name, parentName, phone, age, isAdult, course, paymentMode, TG createdAt, importedAt, status (`new` / `placed` / `dismissed`).
- API (after the user creates the API route): `GET ?status=new|placed|dismissed|all` -> `{players:[...], counts}` (each item has `newPlayerId`); `POST` `{action:"sync"}`, `{action:"list"}`, `{action:"setStatus", newPlayerId, status:"dismissed"|"new"}`, `{action:"markPlaced", newPlayerId, playerId?}` (sets status `placed`; sync never re-imports it). Allowed for CoachLife admin / superadmin / coach.
- Reads TG's `Online_Session.Registration` with the **same `MONGO_URI`** by default (the first real sync will show whether that works; a failure returns the Mongo error in the response). If TG is on another cluster, set `TG_MONGO_URI` (and optionally `TG_DB_NAME`, `TG_COLLECTION`) on the Lambda. Whether one cluster serves both is Q8 below.

**Step 2 - New players section: BUILT (2026-11-16), tested in a browser with the API mocked only.** `CoachLife/frontend/src/components/NewPaidPlayers.jsx`, shown at the top of the admin **Players** page (`pages/admin/Players.jsx`) and the coach **My Players** page (`pages/coach/MyPlayers.jsx`). Compact one-line rows: name + age, "Possible duplicate" tag (tooltip has the reason), parent / phone, course, registered date, Dismiss / Restore. **Auto-sync (user's rule): runs once when CoachLife is opened and then every 15 minutes while it stays open** (admins and coaches; `utils/newPlayersApi.js` `startNewPlayersAutoSync`, started from `components/Sidebar.jsx`; throttled at module level so page changes do not re-sync; skipped while the tab is hidden; a failed sync retries after ~2 min). The **Sync** button forces a check and counts as a sync. **Add player** button on each row (admin Players page only) opens the normal Add Player popup pre-filled from the registration: name, phone, age; **Father's name = the registration's parent name unless it is just the player's own name (adult registering themselves)**, or `fatherName` if the registration has one; mother, date of birth, address, alternate number when present; **Learning Pathway is auto-matched from the TG `course`** by keyword (`foundation` / `intermediate` / `advanced` -> the CoachLife pathway whose name contains that word; `tgsessions` looks for "TG Session") or taken from a `LearningPathway` field if the registration has one - left blank only when nothing matches (the person picks it); once the player is saved, `markPlaced` takes the registration off the New list for good. **Dismiss** hides it; an **Undo** bar appears for 10 s after a dismiss and a **Dismissed (n)** button (always visible) lists dismissed ones with **Restore**. Sidebar **Players / My Players** shows an amber count badge (`components/Sidebar.jsx`, refreshes via the `newplayers:changed` window event). **UI rule from the user: never show the word "paid" on screen** (say "New players" / "Registered on").

**Still to build (blocked on the open questions):** the **Add to batch** action (creates the player, puts them in a batch with room, assigns the coach). Nothing of these exists yet.

**The importer needs only database access, not the TG project** (user's decision, 2026-11-16). It reads `Online_Session.Registration` through `MONGO_URI` (or `TG_MONGO_URI` if TG is on another cluster).

**Open questions - waiting for the user, do not guess:**
1. Who is notified and who places the player? (default proposed: coaches see them and place them)
2. Mapping of TG `course` -> CoachLife `LearningPathway` name (e.g. `foundation` -> "AI Foundation for Kids"?).
3. How new paid players arrive: Sync button + refresh on page open, or a scheduled job.
4. Is an in-app badge enough, or also a WhatsApp / email message to the coach?

Until these are answered, **do not build Integration B.** Whoever picks it up must
first record the answers in this file.

---

## 4. Rules for every Claude session on these projects

1. **No secrets in files, commits, chat or logs.** Copy secrets between Lambdas with the AWS CLI without printing them. `AUTH_SECRET` and `MONGO_URI` never go in code or docs.
2. **Do not touch the TG payment path** (`TG_Create`, `TG_Create_Offered`, `TG_Verify`, `TG_Webhook`, `TG_Stripe`, `TG_Razorpay*`, `TG_UpdatePayment`, `TG_PaymentFollowup`) unless the user explicitly asks.
3. **Do not read production credentials to query or write the DB directly.** This was blocked by the permission system once and must not be worked around. Go through the apps' own APIs / UI, or ask the user to run it.
4. **Deploying a Lambda or changing its env is allowed only for what the user asked.** Say exactly what you deployed. After a deploy, test with a token-less / forged-token call, never with real student data.
5. **Do not edit the other repo's code unless the user asked for it.** The TG repo often has the user's own uncommitted edits (`Leads.jsx`, `TG_Create.py`, ...). Make minimal, additive edits and never revert theirs.
6. **Commit only when the user asks.** Nothing from this work is committed yet.
7. **Be honest about testing.** Say what was verified against the real system and what was only mocked.
8. **Batch and player names stay hidden from the Leads CRM** (its token only reaches the name-free `?view=available`). They are shown on the CoachLife schedule page, scoped as described in section 2.
9. **UI conventions:** CoachLife uses inline styles and the sidebar's navy->purple button gradient (see `CoachLife/CLAUDE.md`). The TG CRM uses its own `lm-` CSS classes in `Leads.jsx`.
10. **Update this file** (Status + Change log) in **both** repos whenever cross-project behaviour changes.

---

## 5. Quick reference

| Thing | Where |
|---|---|
| Slots Lambda | `CoachLife/backend/CL_Manage_Slots/lambda_function.py` (deployed as `CL_Manage_Slots`, python3.10, shares the `LambdaExecutionRole`) |
| Slots API URL | `https://zpmd0d7dwc.execute-api.ap-south-1.amazonaws.com/default/CL_Manage_Slots` |
| CoachLife slots page | `CoachLife/frontend/src/pages/admin/SessionSlots.jsx`, route in `App.jsx`, menu in `components/Sidebar.jsx` |
| CRM slots panel | `TechnologyGarage/src/pages/Marketing/AvailableSlots.jsx`, button in `Leads.jsx` |
| CRM login / token | `TG_Leads_Auth`, `TG_Leads`, `src/pages/Marketing/auth.js` |
| TG registration writer | `TechnologyGarage/backend/TG_Create.py` -> `Online_Session.Registration` |
| TG payment confirm | `TG_Verify.py`, `TG_Webhook.py` set `status: "success"` |
| Registration importer (Integration B step 1) | `CoachLife/backend/CL_Sync_Registrations/lambda_function.py` (deployed as `CL_Sync_Registrations`, no API route yet) |
| CoachLife add player | `CoachLife/backend/CL_Add_Players/lambda_function.py` |
| CoachLife batches | `CL_Get_Batches`, `CL_Manage_Batch` (capacity is NOT yet enforced there; the slots page only displays it) |
| CoachLife backend index | `CoachLife/backend/BACKEND.md` |

---

## 6. Questions for the Technology Garage session  (NOT NEEDED NOW - see note)

> **UPDATE 2026-11-16 - the user decided this is NOT needed.** The registration importer
> reads the Technology Garage **database directly** (`Online_Session.Registration`, read-only)
> and does not depend on the TG project's code, endpoints or session. **The TG session does
> not need to answer 6.1-6.3.** The only thing that can still matter is whether the same
> MongoDB cluster serves both databases (Q8) - and the first real sync will show that on its
> own. Leave the questions below as optional background; do not spend time on them unless the
> user asks. Section 6.4 (questions for the USER) is still open.

**Who this was for:** the Claude session working in `/Users/tg/Desktop/TechnologyGarage`.
The CoachLife session is designing Integration B (section 3) and needs facts that only the
TG repo / TG session can confirm. **Read sections 1-4 first, then answer below.**

**How to answer**
1. This is a **read-only investigation**. Read code, docs (`CLAUDE.md`, `backend.md`, `frontend.md`) and the Lambda sources. **Do not change any TG code, do not deploy, do not touch the payment Lambdas.**
2. Write each answer under its **Answer:** line. Keep it short and factual. If you do not know, write `UNKNOWN` and say what would settle it - do not guess.
3. **Never paste real student data or secrets.** Describe fields and types; use made-up examples (e.g. `name: "asha k"`, `phone: "9XXXXXXXXX"`). Never print `MONGO_URI`, `AUTH_SECRET`, passwords or tokens.
4. Do **not** query the production database yourself. If an answer needs live data, say so and tell the user exactly what to look at.
5. When finished, write the **same text into BOTH copies** of this file (TG repo and `/Users/tg/Desktop/CoachLife/CROSS_PROJECT.md`) so they stay identical, then add a line to the Change log. Tell the user "answers written".

### 6.1 Registration data (what is really stored)

**Q1. Full field list of one `Online_Session.Registration` document** after a successful payment: every field name, its type, and when it is set (at create / at verify / at webhook). Code shows `name, parentName, phone, age, course, isAdult, status, paymentMode, createdAt, couponCode?, razorpay_payment_id` - what else exists (e.g. `razorpay_order_id`, `razorpay_subscription_id`, payment time, email, address, date of birth)? Is there a **paid-at timestamp**?
Why: decides what CoachLife can copy into a new player and what to show coaches.
**Answer:**

**Q2. Every possible value of `status`** and what each means (`pending`, `success`, `halted`, `cancelled`, `expired`, anything else?). Which code sets each one (`TG_Create`, `TG_Verify`, `TG_Webhook`, `TG_Stripe`, manual edits)? For `autopay` subscriptions, does `success` mean "first payment done" and can it later flip to `halted`/`cancelled`?
Why: "paid" must be defined exactly. We import only paid registrations and need to know what to do if a paid student later becomes `halted`/`cancelled`.
**Answer:**

**Q3. Definition of PAID for import.** Is `status == "success"` alone enough, or must `razorpay_payment_id` also be present (as `TG_Create.py` line ~78 suggests)? What about `paymentMode == "manual"` - when is a manual-payment registration marked `success`, and by whom?
**Answer:**

**Q4. `TG_Stripe.py` and `TG_Create_Offered.py`** (the `/enroll` page, `source: "enroll"`): do they write to the same `Registration` collection with the same fields and the same meaning of `status`? Any extra fields (`source`, currency, country)?
**Answer:**

**Q5. Duplicates and identity.** What uniquely identifies a student? (`TG_Create` de-dupes by name?) Can one parent phone have several children? Can the same child appear twice (re-registration, second course)? Is `name` stored lower-cased (code says yes)?
Why: CoachLife must not create the same player twice.
**Answer:**

**Q6. Courses.** Exact meaning of each course key - `foundation`, `intermediate`, `advanced`, `tgsessions` (and `tgsessionstest`): the label, the age range or level, and how many sessions. Is there any TG-side text that maps these to learning pathway names?
**Answer:**

**Q7. Time format.** What exact format/timezone is `createdAt` (string from `indian_time()`?) Give the format string. Is there any other timestamp?
**Answer:**

### 6.2 How CoachLife should get the data

**Q8. Same database cluster?** Do the TG Lambdas (`TG_Create`, `TG_Verify`, `TG_Webhook`, ...) and the CoachLife Lambdas use the **same MongoDB cluster** (just different databases `Online_Session` vs `CoachLife`)? Answer yes/no/unknown and, if you can see it from env **names only** or docs, whether one DB user can read both. **Do not print any connection string.**
Why: if yes, a CoachLife Lambda can read `Registration` directly (read-only); if no, TG must expose an API.
**Answer:**

**Q9. Existing read endpoint.** `TG-REGISTRATION-VIEW` backs the `/admin` page (`ViewPlayers.jsx`). What does it return, how is it authenticated (`TG_Admin_Auth`?), and is its source in this repo? Could a read-only "paid and not yet handed over" list be added **without touching** the payment Lambdas?
**Answer:**

**Q10. Preferred transport.** Given the rule "never modify the payment path", which do you recommend, and why?
 (a) CoachLife **pulls** directly from Mongo on demand / on a schedule;
 (b) TG adds a **new, separate, read-only Lambda** that returns paid registrations;
 (c) TG **pushes** to CoachLife after payment (this needs a change in `TG_Verify`/`TG_Webhook` - the user does NOT want that unless there is no alternative).
**Answer:**

**Q11. "Already handed over" marker.** Does a field/flag already exist to mark a registration as processed? If not, is it acceptable for CoachLife to keep its **own** record of imported registration `_id`s (so TG data is never written to)? Say if TG needs to know a student was onboarded.
**Answer:**

### 6.3 Context that might change the design

**Q12. In-flight TG changes.** `git status` in the TG repo shows uncommitted edits to `TG_Create.py`, `TG_Verify.py`, `registration.jsx`, `Leads.jsx` and `CLAUDE.md`. In one or two lines each: what are they, and do they change registration fields, `status` values or payment confirmation? Anything the CoachLife session must wait for?
**Answer:**

**Q13. Leads vs registrations.** Does the Leads CRM (`TG_Marketing`) link a lead to a registration (e.g. by phone)? When a lead pays, does anything update the lead's status? (Information only - not part of this build.)
**Answer:**

**Q14. Personal data.** Registrations hold a minor's name, parent name and phone. Is there any TG privacy rule (`PrivacyPolicy.jsx`, `policy/`) that limits sharing that data with the CoachLife coaches/admins? Anything we must not copy (e.g. coupon, payment ids)?
**Answer:**

**Q15. Anything else** the CoachLife session should know that could make this integration wrong or unsafe.
**Answer:**

### 6.4 Questions for the USER (the CoachLife session asked these; answers decide the build)

1. **Who is notified and who places the new player into a batch?** (proposed default: coaches see new paid students and place them; admins can too)
   **Answer:**
2. **Course -> CoachLife Learning Pathway mapping** (CoachLife pathway names exactly as they appear in CoachLife):
   `foundation` -> **Answer:** &nbsp;&nbsp; `intermediate` -> **Answer:** &nbsp;&nbsp; `advanced` -> **Answer:** &nbsp;&nbsp; `tgsessions` -> **Answer:**
3. **How do new paid players arrive in CoachLife?** (Sync button + refresh on page open, or a scheduled job every N minutes)
   **Answer:**
4. **Is an in-app badge enough to "let the coach know"?** or also WhatsApp / email to the coach?
   **Answer:**
5. **Which coach is told for a brand-new player** (they have no coach yet): all coaches, or an admin assigns one first?
   **Answer:**
6. **What if a paid player later becomes `halted` / `cancelled`?** Do nothing, flag them in CoachLife, or remove them from the batch?
   **Answer:**

---

## 7. Change log

- **2026-11-16** - Integration A built: `CL_Manage_Slots` Lambda (+ CRM read-only token path), CoachLife Session Slots page, TG CRM Available slots panel. Slot length fixed to 60 min. Copy button and "Next available" removed from the CRM panel at the user's request. This file created.
- **2026-11-16** - Integration B (registration -> CoachLife) discussed and designed; four open questions sent to the user; nothing built.
- **2026-11-16** - Section 6 added: questions for the Technology Garage session (read-only investigation, answers to be written into this file in both repos) and for the user.
- **2026-11-16** - User confirmed: TG stores a registration and keeps the paid student; CoachLife must import them once as **Players**, with a duplicate check. Built `CL_Sync_Registrations` (import + duplicate flags + list + dismiss), tested locally, **not deployed**. New Players page and Add-to-batch still not built.
- **2026-11-16** - Terminology fixed at the user's request: in CoachLife they are **Players**, not students. Renamed the importer's collection to `NewPlayers`, API list key to `players`, id field to `newPlayerId`, page to **New Players**.
- **2026-11-16** - Deployed `CL_Sync_Registrations` (python3.10, shared role, only `MONGO_URI` copied from `CL_Manage_Slots`). Verified OPTIONS 200 and 401 for missing / bad token. Waiting for the user to create the API route and send the URL; the New Players page and Add-to-batch are still unbuilt.
- **2026-11-16** - User decided the importer only needs the Technology Garage **database**, not the TG project: section 6.1-6.3 questions for the TG session marked NOT NEEDED. Section 6.4 (user questions) still open.
- **2026-11-16** - Route created by the user and wired. Per the user: no separate page - the list is a compact "New players" section inside the Players pages (admin + coach), with a count badge on the Players menu item; no "paid" wording in the UI. Separate page/route/menu item removed. Add-to-batch still unbuilt (waiting on section 6.4 answers). Nothing committed.
- **2026-11-16** - Per the user: auto-sync every 15 minutes while the app is open (app-level, not page-level). Added **Add player** (pre-filled Add Player popup) on each New-players row and `markPlaced` on `CL_Sync_Registrations` (redeployed). Added Undo bar + always-visible Dismissed list for accidental dismisses. Fixed the Dismiss button overlapping the date column. Add-to-batch still unbuilt; nothing committed.
- **2026-11-16** - Fixed: Father's name / Learning Pathway were not reaching the Add Player form. Importer (redeployed) now also copies optional father/mother/DOB/address/alt-phone/pathway fields and refreshes still-`new` records on every sync; Add Player prefill uses the parent name as Father's name unless it equals the player's own name and auto-matches the Learning Pathway from the course. Also fixed the New-players columns overlapping (TG date format `DD-MM-YYYY HH:MM:SS` was not parsed).
- **2026-11-16** - User confirmed the learning pathway is stored in the TG registration as `course`. Add Player prefill now matches `course` by text (exact name, contains, then keywords foundation / intermediate / advanced / tgsession), so both short keys (`foundation`) and full names ("Foundation Level", "AI Foundation for Kids") work. If no CoachLife pathway name contains the course word it stays blank - an explicit course -> pathway mapping from the user is then needed (section 6.4 Q2).
- **2026-11-16** - Missing-pathway prompt (user request): when a registration's `course` has no matching CoachLife learning pathway, the New players section shows an amber notice ("New pathway needed in CoachLife: <name> (n players) ... ask a coach to add it") with an **Add pathway** button for admins (opens `/admin/learning-pathway/add`), flags the affected rows' course tag, and the Add Player popup says the same. Matching rules moved to `frontend/src/utils/pathwayMatch.js` (shared by the list and the popup). Judged only after CoachLife's pathway list has loaded.
- **2026-11-17** - Menu renamed Session Slots -> **Session Scheduled**. Schedule page rebuilt as a Teams-style calendar with batch names, player names and seat counts in the event bubbles, plus search by batch or player (a player search shows their batch). `CL_Manage_Slots` redeployed to return names for signed-in CoachLife admins (scoped for non-super admins; CRM path still name-free). Added viewer time-zone display (Auto / IST / CT with CST-CDT by date). Search box styling fixed (theme.css forces input styles with `!important`, so it needs a scoped rule). Nothing committed.
- **2026-11-17** - Search fix: `CL_Manage_Slots` redeployed to also return `unscheduled` batches and a `hiddenBatches` count; the schedule page now searches those too (details card, "No days or time set yet") and shows "N batch(es) hidden for your login" for scoped admins. Player names now always show inside calendar blocks (hour rows 56 -> 64px).
- **2026-11-17** - Search behaviour per the user: stay on the calendar and glide to the matching batch (smooth scroll + pulse + marked name) instead of a results table or a static dropdown.
