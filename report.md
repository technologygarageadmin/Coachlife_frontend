# CoachLife — Comprehensive Bug & Defect Report

> Generated: 2026-06-23  
> Scope: Frontend (React/JSX), Backend (AWS Lambda/Python), State (Zustand store)

---

## CRITICAL

---

### C-01 · `store.js` — `fetchPlayers` sends `Authorization` header (CORS violation)
- **File:** `frontend/src/context/store.js` ~line 562–563
- **Severity:** Critical
- **Category:** API
- **Description:** `fetchPlayers` adds `Authorization: Bearer ${token}` to the request headers. The project convention explicitly forbids this header because it causes CORS preflight failures. Same issue in `fetchCoaches` (~line 886–887).
- **Fix:** Remove both `headers['Authorization'] = \`Bearer ${token}\`` lines. `userToken` header is already set by the Axios interceptor.

---

### C-02 · `PlayerSessions.jsx` — Session card links point to a broken route
- **File:** `frontend/src/pages/coach/PlayerSessions.jsx` ~lines 155, 204, 254
- **Severity:** Critical
- **Category:** Navigation
- **Description:** All session card links use `to={\`/session/${session.sessionId}\`}`. The actual route in `App.jsx` is `/coach/session/:sessionId`. The path `/session/...` is not registered anywhere — it hits the 404 wildcard.
- **Fix:** Change all three `to` props to `` `/coach/session/${session.sessionId}` ``.

---

### C-03 · `PlayerSessions.jsx` — Uses local Zustand `sessionHistory` (demo data only)
- **File:** `frontend/src/pages/coach/PlayerSessions.jsx` ~lines 43, 82
- **Severity:** Critical
- **Category:** Bug
- **Description:** The page reads from the in-memory `sessionHistory` array in Zustand. This array contains only five hard-coded demo records and is never populated from the API. Real session cards fetched from `CL_View_Sessioncard` are never written to this array. The page always shows stale demo data.
- **Fix:** Fetch session cards directly from `CL_View_Sessioncard` using the player's `sessionCardIds`, like `PlayerDetail.jsx` does.

---

### C-04 · `PastSessions.jsx` — Uses same stale `sessionHistory` demo data
- **File:** `frontend/src/pages/coach/PastSessions.jsx` ~line 40
- **Severity:** Critical
- **Category:** Bug
- **Description:** `mySessions` is filtered from `sessionHistory` by `coachId`. Since `sessionHistory` only contains five hard-coded demo records (none with a real `coachId`), every coach always sees "No sessions yet". Additionally `{session.player}` is rendered but the demo shape uses `playerName`, so the player column would show `undefined` even with demo data.
- **Fix:** Fetch past sessions from the API — pull all assigned players' `sessionCardIds` and filter by `status === 'completed'`.

---

### C-05 · `Dashboard.jsx` — Session counters always show demo/wrong data
- **File:** `frontend/src/pages/common/Dashboard.jsx` ~line 100
- **Severity:** Critical
- **Category:** Bug
- **Description:** `const [hasLoadedInitial] = useState(false)` — the setter is never destructured so state never changes. More critically, `sessionHistory` (used for total sessions count) contains only demo records, so session counters are always wrong for all users.
- **Fix:** Remove `hasLoadedInitial` guard; replace session counts with real API-fetched data.

---

## HIGH

---

### H-01 · `SessionDetail.jsx` — `location` in `useEffect` deps causes double-fetch & wipes feedback
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~line 193
- **Severity:** High
- **Category:** Bug
- **Description:** The primary data-fetch `useEffect` has `[sessionId, userToken, location]` as dependencies. Every time the page is rendered with new navigation state (e.g., switching between batch player chips), `location` changes and the effect fires again, re-fetching the session and wiping any local feedback state the coach entered mid-session. The CLAUDE.md explicitly warns against using `location` or `location.key` in `useEffect` deps.
- **Fix:** Change dep array to `[sessionId]` only. Handle the location-state fast path with a `useRef` flag so it only runs once.

---

### H-02 · `SessionDetail.jsx` — Activity feedback "Clear" button does not clear `sessionData`
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~lines 2069–2075
- **Severity:** High
- **Category:** Bug
- **Description:** The "Clear" button only clears `activityFeedbackMap[index]`. It does **not** call `saveActivityFeedback` to clear `sessionData.activities[index].feedback`. When the coach submits the session, `doCompleteSession` reads `activity.feedback` from `sessionData.activities`, so previously saved feedback persists invisibly even after clicking Clear.
- **Fix:** After clearing `activityFeedbackMap`, also call `saveActivityFeedback(index, { rating: 0, coachComment: '' })`.

---

### H-03 · `SessionDetail.jsx` — `handleAddFeedback` status update is tautological
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~line 295
- **Severity:** High
- **Category:** Bug
- **Description:** `status: result.status === 'in_progress' ? 'in_progress' : 'in_progress'` — always sets `'in_progress'` regardless of the API response. The ternary does nothing and masks the real API status value.
- **Fix:** Use `result.status || 'in_progress'` to propagate the actual API response.

---

### H-04 · `SessionDetail.jsx` — `getToken()` calls `useStore.getState()` inside component
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~lines 23–29
- **Severity:** High
- **Category:** Bug
- **Description:** `getToken()` is defined inside the component and calls `useStore.getState()` — Zustand's imperative accessor — every time it's invoked. It bypasses the reactive subscription model. If the token changes, stale values may be used in async callback paths.
- **Fix:** Remove `getToken()` entirely; use `userToken` already destructured from `useStore()` on line 13.

---

### H-05 · `customCardGenerate.jsx` — Dark mode is permanently broken (reads non-existent store field)
- **File:** `frontend/src/pages/admin/customCardGenerate.jsx` ~line 17
- **Severity:** High
- **Category:** Bug / Dark Mode
- **Description:** `const { userToken, darkMode: dark } = useStore()` — the Zustand store has no `darkMode` field. `dark` is always `undefined` (falsy). All conditional dark-mode styling in this file is dead code. The page is permanently locked in light mode regardless of the user's theme setting.
- **Fix:** Replace with `const { theme } = useTheme()` and `const dark = theme === 'dark'`, consistent with all other pages.

---

### H-06 · `PlayerDetail.jsx` (coach) — `localStorage.getItem('userToken')` uses wrong key
- **File:** `frontend/src/pages/coach/PlayerDetail.jsx` ~line 167
- **Severity:** High
- **Category:** Bug
- **Description:** `const token = userToken || localStorage.getItem('userToken')` — auth is stored under key `coachlife_auth` as a JSON object, not under a bare `userToken` key. This fallback always returns `null`, making the session-card fetch unauthenticated (401) when `userToken` from Zustand is absent (e.g., on page reload).
- **Fix:** `JSON.parse(localStorage.getItem('coachlife_auth') || '{}').userToken`

---

### H-07 · `SessionCardManage.jsx` — Two `useEffect`s both call `fetchPlayers()` on mount (double request)
- **File:** `frontend/src/pages/admin/SessionCardManage.jsx` ~lines 106–118
- **Severity:** High
- **Category:** Bug
- **Description:** Effect 1 fires on `[userToken]`; Effect 2 fires on `[location.key]`. Both fire on the initial render, sending two simultaneous GET requests to `CL_Get_All_Players`.
- **Fix:** Remove the `[userToken]` dependency from the first effect (or merge both into one effect).

---

### H-08 · `SessionCardManage.jsx` — `setSelectedPlayer(null)` fires on every navigation (defeats persistence)
- **File:** `frontend/src/pages/admin/SessionCardManage.jsx` ~line 115
- **Severity:** High
- **Category:** Bug
- **Description:** `setSelectedPlayer(null)` is called inside the `[location.key]` effect — i.e., every time the page re-mounts. The Zustand `selectedPlayer` is persisted specifically to remember the last selected player across navigations, but this effect immediately clears it on every visit.
- **Fix:** Only call `setSelectedPlayer(null)` on first mount using a `useRef` flag.

---

### H-09 · `PlayerSessions.jsx` — Access-denied guard fires on page reload (players not yet loaded)
- **File:** `frontend/src/pages/coach/PlayerSessions.jsx` ~lines 43–45
- **Severity:** High
- **Category:** Bug
- **Description:** `const player = players.find(p => p.playerId === playerId)` — `players` in Zustand is not persisted and is empty on reload. The guard `if (!player || player.primaryCoach !== currentUser.id)` then shows "Access Denied" even for a legitimate coach who loaded the page via direct URL or browser refresh.
- **Fix:** Call `fetchPlayers()` if `players` is empty before rendering the access-denied guard.

---

### H-10 · `LearningPathwayBuilder.jsx` — Delete request uses `usertoken` (wrong header casing)
- **File:** `frontend/src/pages/admin/LearningPathwayBuilder.jsx` ~line 76
- **Severity:** High
- **Category:** API
- **Description:** `{ ...(userToken && { usertoken: userToken }) }` (lowercase `t`) for the delete call. The backend checks for `userToken` (camelCase). This may pass in some AWS environments (which lowercase headers) but will fail in strict ones.
- **Fix:** Use `userToken` (capital T) consistently.

---

## MEDIUM

---

### M-01 · `store.js` — `fetchCoaches` also sends `Authorization` header (duplicate of C-01)
- **File:** `frontend/src/context/store.js` ~lines 885–887
- **Severity:** Medium → Already noted as C-01
- **Fix:** Remove `Authorization` header from `fetchCoaches`.

---

### M-02 · `SessionDetail.jsx` — Loading skeleton uses hardcoded `background: 'white'` (dark mode broken)
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~lines 856, 889
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** Loading skeleton renders `background: 'white'` and `border: '1px solid #E2E8F0'` regardless of theme. In dark mode these render as stark white blocks.
- **Fix:** Use `surface` and `border` CSS variable shortcuts (already defined at lines 16–21).

---

### M-03 · `SessionDetail.jsx` — Project workflow section hardcodes `#000000`, `#666666`
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~lines 1801, 1811
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** Workflow heading and list items use `color: '#000000'` / `color: '#666666'`. Invisible in dark mode.
- **Fix:** Replace with `textPrimary` / `textSecondary` CSS variable shortcuts.

---

### M-04 · `SessionDetail.jsx` — Objectives/Resources/Expected Outcome cards hardcode border and text
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~lines 1390–1479
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** Three sub-cards inside Activity Details Grid use `background: dark ? ... : '#FFFFFF'` correctly, but then hardcode `border: '1px solid #E5E7EB'` and all text as `color: '#111827'` with no dark variant.
- **Fix:** Replace with `border` and `textPrimary` variable shortcuts.

---

### M-05 · `StartSession.jsx` — No dark mode support
- **File:** `frontend/src/pages/coach/StartSession.jsx`
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** No `useTheme` import. All cards, search bar, batch cards and empty state use `background: '#FFFFFF'`, `border: '1.5px solid #E2E8F0'`, text `#0F172A` / `#94A3B8` — all hardcoded light-mode colours.
- **Fix:** Add `useTheme` and apply conditional CSS variables.

---

### M-06 · `MyPlayers.jsx` — No dark mode support
- **File:** `frontend/src/pages/coach/MyPlayers.jsx`
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** No `useTheme` import. All player cards, stat cards, headers and badges use hardcoded light-mode colours.
- **Fix:** Add `useTheme` and apply conditional CSS variables.

---

### M-07 · `PastSessions.jsx` — No dark mode support
- **File:** `frontend/src/pages/coach/PastSessions.jsx`
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** `background: '#FFFFFF'` hardcoded throughout with no dark variants.
- **Fix:** Add `useTheme` and apply surface variable.

---

### M-08 · `PlayerSessions.jsx` — No dark mode support
- **File:** `frontend/src/pages/coach/PlayerSessions.jsx`
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** All session list containers use `background: '#FFFFFF'` with no dark-mode handling.
- **Fix:** Add `useTheme` and apply surface variable.

---

### M-09 · `PlayerDetail.jsx` (coach) — No dark mode support
- **File:** `frontend/src/pages/coach/PlayerDetail.jsx`
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** Personal information section uses `background: '#FFFFFF'`, `background: '#F8FAFC'`, `border: '1px solid #E2E8F0'`. No `useTheme` import.
- **Fix:** Add `useTheme`, apply conditional CSS variables.

---

### M-10 · `Dashboard.jsx` — No dark mode support
- **File:** `frontend/src/pages/common/Dashboard.jsx`
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** No `useTheme` import. All stat cards, headers and quick-action cards use hardcoded `#0F172A`, `#64748B`, `#FFFFFF`.
- **Fix:** Add `useTheme` and apply dark-mode variants.

---

### M-11 · `Login.jsx` — Uses CSS classes alongside inline styles (inconsistent with convention)
- **File:** `frontend/src/pages/common/Login.jsx` ~line 55
- **Severity:** Medium
- **Category:** UI
- **Description:** Uses `className="login-wrapper"` with a `<style>` block for major layout. Inconsistent with the project convention of inline styles only. If the scoped style is not applied, the layout breaks.
- **Fix:** Migrate to inline styles.

---

### M-12 · `store.js` — `registerCoach` does not clear coaches cache after registration
- **File:** `frontend/src/context/store.js` ~lines 845–865
- **Severity:** Medium
- **Category:** Bug
- **Description:** After registering a coach, `clearCoachesCache()` is not called. The 5-minute cache means the coaches list won't show the new coach until the cache expires.
- **Fix:** Call `clearCoachesCache()` after successful registration.

---

### M-13 · `store.js` — `addPlayer` generates client-side fake ID that can conflict with API
- **File:** `frontend/src/context/store.js` ~lines 519–523
- **Severity:** Medium
- **Category:** Bug
- **Description:** `playerId: \`p${state.players.length + 1}\`` — a sequential fake ID. If called, it would add a record that shadows a real player when the array is later refreshed from the API.
- **Fix:** Remove the local-only `addPlayer` action or mark it clearly as unused/deprecated.

---

### M-14 · `SessionCardManage.jsx` — `useEffect` dep on `sessionCardIds.length` misses same-length array changes
- **File:** `frontend/src/pages/admin/SessionCardManage.jsx` ~lines 120–127
- **Severity:** Medium
- **Category:** Bug
- **Description:** If one session card is deleted and another is generated simultaneously (keeping the same array length), the effect does not re-fire and the displayed cards become stale.
- **Fix:** Use `JSON.stringify(selectedPlayer?.sessionCardIds)` as the dep.

---

### M-15 · `LeaderBoard.jsx` — Ignores most response shapes (only checks `data?.players`)
- **File:** `frontend/src/pages/common/LeaderBoard.jsx` ~lines 103–138
- **Severity:** Medium
- **Category:** API
- **Description:** Fetches players independently of the store but only handles `data?.players`. Ignores `Array.isArray(data)`, `data.Items`, `data.body` (string), etc. Leaderboard shows empty if the API returns a top-level array.
- **Fix:** Unwrap all known response shapes as done in `store.js`'s `fetchPlayers`.

---

### M-16 · `ManageBatches.jsx` — `headers` object sends both `userToken` and `usertoken` (duplicate)
- **File:** `frontend/src/pages/admin/ManageBatches.jsx` ~lines 78–82
- **Severity:** Medium
- **Category:** API
- **Description:** `headers` useMemo sets both `userToken` (correct) and `usertoken` (lowercase, redundant). Sends an unnecessary duplicate header on every call.
- **Fix:** Remove the `usertoken: userToken` entry.

---

### M-17 · Admin pages — No dark mode support (`Coaches`, `AssignPlayers`, `Players`, `Rewards`, `RedeemHistory`)
- **File:** Multiple admin pages
- **Severity:** Medium
- **Category:** Dark Mode
- **Description:** None of these pages import `useTheme`. All use hardcoded `#fff`, `#F8FAFC`, `#0F172A`, `#94A3B8`, `#E2E8F0`. Users in dark mode see blinding white throughout the admin section.
- **Fix:** Add `useTheme` and apply the CSS variable pattern used in `SessionCardManage.jsx`.

---

### M-18 · `ProtectedRoute.jsx` — 10ms hydration timer is a race condition
- **File:** `frontend/src/components/ProtectedRoute.jsx` ~lines 11–19
- **Severity:** Medium
- **Category:** Bug
- **Description:** A 10ms `setTimeout` is used to wait for Zustand's `persist` middleware to hydrate. On slow machines this may be insufficient, causing `isAuthenticated` to still be `false` when the check runs, immediately redirecting the user to `/login`.
- **Fix:** Use Zustand's `useStore.persist.hasHydrated()` or the `onRehydrateStorage` callback for deterministic hydration detection.

---

### M-19 · `SessionDetail.jsx` — Copy code button uses `alert()` instead of Toast
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~line 1880
- **Severity:** Medium
- **Category:** UI
- **Description:** `alert('Code copied to clipboard!')` blocks the UI. Every other notification in the app uses the `Toast` component.
- **Fix:** Replace with `setToast({ isVisible: true, message: 'Code copied!', type: 'success' })`.

---

### M-20 · `SessionDetail.jsx` — `handleSaveDraft` uses three `alert()` calls instead of Toast
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~lines 434, 449, 452
- **Severity:** Medium
- **Category:** UI
- **Description:** Draft save uses `alert()` for validation errors and success confirmation. Inconsistent with the rest of the app.
- **Fix:** Replace all three with `setToast(...)`.

---

## LOW

---

### L-01 · `Sidebar.jsx` — `activeMode` defaults to `'admin'` on public routes
- **File:** `frontend/src/components/Sidebar.jsx` ~line 41
- **Severity:** Low
- **Category:** UI
- **Description:** On public routes (`/leaderboard`, `/`), `activeMode` defaults to `'admin'`, so coaches navigating to the leaderboard see admin menu items until they navigate back to `/coach`.
- **Fix:** Default to `'coach'` when `currentUser?.role === 'coach'` and active mode is not yet set.

---

### L-02 · `store.js` — `getAllRoles()` can return `[undefined]` instead of `[]`
- **File:** `frontend/src/context/store.js` ~line 207
- **Severity:** Low
- **Category:** Bug
- **Description:** `return state.currentUser?.roles || [state.currentUser?.role] || []` — when `currentUser` is null, `state.currentUser?.role` is `undefined`, so the array `[undefined]` is returned (a truthy non-empty array, tricking role checks).
- **Fix:** `return state.currentUser?.roles || (state.currentUser?.role ? [state.currentUser.role] : [])`.

---

### L-03 · `store.js` — `redeemReward` reads `reward.name` but model uses `rewardName`
- **File:** `frontend/src/context/store.js` ~line 1183
- **Severity:** Low
- **Category:** Bug
- **Description:** `rewardName: reward.name` — the Reward data model field is `rewardName`, not `name`. The local `redeemHistory` entry will have an empty `rewardName`.
- **Fix:** Use `reward.rewardName`.

---

### L-04 · `LearningPathwayBuilder.jsx` — `renameModal` state set but never rendered
- **File:** `frontend/src/pages/admin/LearningPathwayBuilder.jsx` ~line 39
- **Severity:** Low
- **Category:** UI
- **Description:** `renameModal` state is declared but no JSX renders the rename modal. The rename feature is dead/incomplete code.
- **Fix:** Either implement the rename modal UI or remove the dead state.

---

### L-05 · `SessionDetail.jsx` — `saveActivityFeedback` mutates activities array in place
- **File:** `frontend/src/pages/coach/SessionDetail.jsx` ~lines 353–361
- **Severity:** Low
- **Category:** Bug
- **Description:** `{ ...prev }` shallow-copies the session object but `updated.activities` still references the same array. Assigning `updated.activities[activityIndex] = {...}` mutates the original array — React may not detect the change since the array reference is unchanged.
- **Fix:** Also spread the activities array: `updated.activities = [...prev.activities]; updated.activities[activityIndex] = {...}`.

---

### L-06 · `customCardGenerate.jsx` — `fetchPathways` re-fires if `userToken` changes mid-session
- **File:** `frontend/src/pages/admin/customCardGenerate.jsx` ~line 55–56
- **Severity:** Low
- **Category:** Bug
- **Description:** `useEffect(() => { fetchPathways(); }, [userToken])` — a token refresh would re-fetch and discard any activities the admin had already arranged.
- **Fix:** Use a `useRef` flag to run the fetch exactly once on mount.

---

### L-07 · `pal()` helper crashes on empty string input (NaN index)
- **File:** Multiple files that define `pal()` locally without the `|| 0` guard
- **Severity:** Low
- **Category:** Bug
- **Description:** `''.charCodeAt(0)` returns `NaN`. `NaN % 8` is `NaN`. `PALETTES[NaN]` is `undefined`, causing a destructuring crash when a player/batch has an empty name.
- **Fix:** Add `|| 0` guard: `PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length]`.

---

### L-08 · `SessionCardManage.jsx` — Duplicate delete Modal blocks (known issue, documented)
- **File:** `frontend/src/pages/admin/SessionCardManage.jsx`
- **Severity:** Low
- **Category:** UI
- **Description:** Two `<Modal>` blocks for delete confirmation exist in the file. The second renders on top of the first, creating a confusing double-modal delete flow.
- **Fix:** Deduplicate to a single `<Modal>` block driven by `deleteConfirm` state.

---

### L-09 · `selectedPlayer` in Zustand may have stale `sessionCardIds` after reload
- **File:** `frontend/src/context/store.js` ~line 1277
- **Severity:** Low
- **Category:** State Management
- **Description:** `selectedPlayer` is persisted to localStorage including its `sessionCardIds` snapshot. Hours later this snapshot may be stale (new cards generated or old ones deleted). The `SessionCardManage.jsx` dep on `sessionCardIds.length` won't detect this.
- **Fix:** Don't persist `sessionCardIds` in `selectedPlayer`; always re-fetch the player from the API when selecting.

---

### L-10 · `ManageBatches.jsx` — `loadBatches` errors are swallowed silently
- **File:** `frontend/src/pages/admin/ManageBatches.jsx` ~lines 89–94
- **Severity:** Low
- **Category:** Bug
- **Description:** Inside a `Promise.all([loadBatches(), fetchPlayers(), fetchCoaches()])`, any single failure sets a generic toast but individual error attribution is lost. Users can't tell which service failed.
- **Fix:** Handle `loadBatches` error independently from the store fetch errors.

---

### L-11 · `backend/CL_Start_Session` — Status string casing inconsistency
- **File:** `backend/CL_Start_Session/lambda_function.py`
- **Severity:** Low
- **Category:** API
- **Description:** The Lambda response includes `"status": "in_progress"` (snake_case). Some frontend paths check for `'in progress'` (with a space), and `normalizeStatus` in `PlayerDetail.jsx` maps `"in_progress"` to a different string. Mixed casing across components means some conditional renders may silently fail.
- **Fix:** Standardise on a single status string format (e.g., `"in progress"`) across Lambda responses and all frontend comparisons.

---

## Summary

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| **Bug** | 3 | 6 | 6 | 7 | **22** |
| **Dark Mode** | 0 | 1 | 8 | 0 | **9** |
| **API** | 1 | 2 | 3 | 1 | **7** |
| **Navigation** | 1 | 0 | 0 | 0 | **1** |
| **UI** | 0 | 0 | 2 | 3 | **5** |
| **State Management** | 0 | 0 | 0 | 1 | **1** |
| **TOTAL** | **5** | **9** | **19** | **12** | **45** |

---

## Priority Fix Order

**Do immediately (Critical):**
1. Remove `Authorization: Bearer` headers from `fetchPlayers` and `fetchCoaches` in `store.js` (CORS breakage)
2. Fix broken route links in `PlayerSessions.jsx` (`/session/` → `/coach/session/`)
3. Replace `sessionHistory` demo data reads in `PlayerSessions.jsx` and `PastSessions.jsx` with real API calls
4. Fix `Dashboard.jsx` session counters to use real API data
5. Fix `customCardGenerate.jsx` dark mode — read from `useTheme()` not Zustand

**Do next (High):**
6. Remove `location` from `SessionDetail.jsx` `useEffect` dep array
7. Fix "Clear" button in activity feedback to also clear `sessionData`
8. Fix `PlayerDetail.jsx` (coach) fallback token key (`'coachlife_auth'` not `'userToken'`)
9. Fix `SessionCardManage.jsx` double-fetch and unnecessary `setSelectedPlayer(null)` on every mount
10. Fix `PlayerSessions.jsx` access-denied race condition on reload

**Ongoing (Medium/Low):**
- Apply dark mode support to all pages that currently lack `useTheme`
- Replace all `alert()` calls with `Toast` component
- Fix `pal()` helper crash on empty string
- Fix `ProtectedRoute.jsx` hydration race condition
- Standardise session status string casing across Lambda + frontend
