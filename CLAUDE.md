# CoachLife — Project Reference

## What This Is

CoachLife is a web application for **Technology Garage**, an online learning studio for technology education. Students enrolled in the studio are called **Players**. The instructors who run sessions with them are **Coaches**. The curriculum is structured into **Learning Pathways** (e.g., "AI Foundation for Kids"), each containing numbered sessions with activities.

The app serves as the operational interface for administrators and coaches: admins configure and manage everything, coaches interact with players through session cards.

---

## Core Concepts

| Concept | Meaning |
|---|---|
| **Player** | A student enrolled at Technology Garage |
| **Coach** | An instructor assigned to one or more players |
| **Learning Pathway** | A curriculum (e.g., "AI Foundation for Kids") containing ordered sessions |
| **Session** | One unit of a Learning Pathway — has a topic, objective, and activities |
| **Session Card** | A player-specific copy of a session's activities, generated for each scheduled session |
| **Activity** | A single task/exercise within a session — carries points and accepts feedback |
| **Points** | Earned by completing activities; accumulated as `totalPoints`, redeemable as `PointBalance` |
| **Rewards** | Items players can redeem using their point balance |

### Session Stages (derived from session number)
- Sessions 1–24 → **Foundation**
- Sessions 25–72 → **Intermediate**
- Sessions 73+ → **Advanced**

---

## Features

### Admin Features
- **Player Management** — Add, edit, delete players; set name, contact info, date of birth, blood group, address, Learning Pathway, status
- **Coach Management** — Register new coaches (triggers registration API), edit details, delete coaches
- **Assign Players** — Assign a player to a coach, remove, or swap between coaches (one coach per player at a time)
- **Learning Pathway Builder** — List all pathway sessions grouped by `LearningPathway` name; delete sessions
- **Add / Edit Pathway Session** — Create or edit a session with topic, objective, activities, activity points, session takeaways, SessionType (Primary/Secondary/Advanced)
- **View Pathway Session** — Read-only view of a session's full details
- **Session Card Management** — View all players, select one, see their session cards, generate standard or custom cards, view/edit/delete cards
- **Custom Card Generation** — Navigate to custom-generate-card page to create a tailored session card for a player
- **Rewards Management** — Add, edit, delete rewards (name, description, points required, active flag)
- **Redeem History** — View all redemption records across players
- **Admin Profile** — View/edit profile information

### Coach Features
- **My Players** — View list of assigned players; see their learning pathway, points, and progress
- **Player Detail** — View full profile and session history for a specific player
- **Player Sessions** — View sessions history for a player
- **Start Session** — Select a player → view their session cards → generate a new card if needed → start a session
- **Session Detail** — Work through a session card: view activities with instructions/story/code sections, rate each activity, provide feedback per activity, set overall session rating and coach comment, submit session
- **Past Sessions** — View completed sessions across all assigned players
- **Coach Profile** — View/edit own profile

### Shared Features
- **Dashboard** — Role-aware landing page (same component, different data for admin vs coach)
- **Leaderboard** — All players ranked by total points; auto-refreshes every 10 minutes; coaches see their assigned players highlighted
- **User Profile** — Common profile page

---

## How the Session Flow Works

1. Admin (or coach) opens **Session Card Management** / **Start Session**, selects a player
2. Clicks **Generate Card** → calls `CL_Session_Card_Generating` API with `playerId`
3. Backend creates a player-specific copy of the next session's activities from their assigned Learning Pathway and stores it in MongoDB; returns a `sessionCardId` added to the player's `sessionCardIds` array
4. Coach opens the card → navigates to **Session Detail** (`/coach/session/:sessionId`)
5. Coach works through each activity in sequence (`activitySequence` order): expands it, rates it (1–5 stars), adds per-activity feedback
6. Coach fills in overall session rating and coach comment
7. Coach submits — session status changes to `completed`, player earns points
8. Points accumulate in `totalPoints`; redeemable portion tracked in `PointBalance`

### Custom Card Generation
Admin can also use `/admin/custom-generate-card` to create a card with a specific session/topic rather than the next sequential one. Navigation state must include `{ playerId, playerName, LearningPathway }` — the `LearningPathway` sent to the API is taken from the **player's profile**, not from whichever pathway the admin browsed activities from.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM v7 |
| State | Zustand v5 with `persist` middleware |
| HTTP | Axios (+ native `fetch` for some endpoints) |
| Icons | Lucide React |
| Charts | Recharts |
| Styling | Inline styles throughout — no Tailwind in JSX |
| Crypto | crypto-js (SHA256 password hashing on login) |

---

## Folder Structure

```
src/
  App.jsx               # All routes — public/admin/coach, lazy-loaded
  context/store.js      # Zustand store: auth, players, coaches, API actions
  components/           # Shared UI components
  pages/
    admin/              # Admin-only pages
    coach/              # Coach-only pages
    common/             # Shared pages (Login, Dashboard, LeaderBoard, etc.)
  utils/
    apiPerformance.js   # API timing utilities
```

### Key Components (`src/components/`)
- `Layout.jsx` — Page shell with Sidebar + Navbar
- `Sidebar.jsx` — Role-aware navigation links
- `ProtectedRoute.jsx` — Role-based route guard; redirects if wrong role
- `UnauthorizedModal.jsx` — Shown on session expiry (after 3 consecutive 401s)
- `SessionCard.jsx` — Session card display component
- `ActivityCard.jsx` — Activity display within a session
- `RatingStars.jsx` — Star rating input
- `SkeletonLoader.jsx` — Loading placeholders
- `Toast.jsx` — Ephemeral notification banners
- `Modal.jsx` — Reusable modal wrapper

---

## Route Map

### Public
| Route | Component |
|---|---|
| `/` | Home |
| `/login` | Login |
| `/register` | Register |
| `/leaderboard` | LeaderBoard |

### Admin (requires `admin` role)
| Route | Component | Purpose |
|---|---|---|
| `/admin` | Dashboard | Admin dashboard |
| `/admin/profile` | AdminProfile | Admin's own profile |
| `/admin/players` | Players | Manage all players |
| `/admin/player-detail/:playerId` | PlayerDetail | View player profile |
| `/admin/coaches` | Coaches | Manage coaches |
| `/admin/assign-players` | AssignPlayers | Coach↔player mapping |
| `/admin/session-card` | SessionCardManage | Session card CRUD |
| `/admin/view-session-card/:id` | ViewSessionCard | Read-only card view |
| `/admin/edit-session-card/:id` | EditSessionCard | Edit a card |
| `/admin/custom-generate-card` | CustomCardGenerate | Custom card creation |
| `/admin/learning-pathway` | LearningPathwayBuilder | List/delete pathway sessions |
| `/admin/learning-pathway/add` | AddPathway | Add pathway session |
| `/admin/learning-pathway/:id/view` | ViewPathway | Read-only session view |
| `/admin/learning-pathway/:id/edit` | EditPathway | Edit pathway session |
| `/admin/rewards` | Rewards | Rewards catalog CRUD |
| `/admin/redeem-history` | RedeemHistory | Redemption log |

### Coach (requires `coach` role)
| Route | Component | Purpose |
|---|---|---|
| `/coach` | Dashboard | Coach dashboard |
| `/coach/players` | MyPlayers | Assigned players list |
| `/coach/player/:playerId` | PlayerDetail | Player profile |
| `/coach/player/:playerId/sessions` | PlayerSessions | Player session history |
| `/coach/start-session` | StartSession | Pick player for session |
| `/coach/start-session/:playerId` | StartSession | Start with pre-selected player |
| `/coach/session/:sessionId` | SessionDetail | Active session card |
| `/coach/view-completed-session/:sessionId` | ViewSessionCard | Completed session read-only |
| `/coach/past-sessions` | PastSessions | All past sessions |
| `/coach/profile` | CoachProfile | Coach's own profile |

---

## Auth Pattern

- Password hashed with SHA256 (CryptoJS) before sending to login API
- On success: user object + `userToken` stored in Zustand + `localStorage` (`coachlife_auth` key)
- Zustand's `persist` middleware hydrates auth on page reload
- Axios request interceptor attaches `userToken` header to **every** request
- **Do not use `Authorization: Bearer` header** — it causes CORS issues; use `userToken` header only
- 401 handling: counts consecutive errors; after 3, shows `UnauthorizedModal` → user clicks logout → clears all state + redirects to `/login`
- Roles stored as array in `currentUser.roles`; primary role in `currentUser.role` (string)
- `ProtectedRoute` checks `requiredRole` against `currentUser.roles`

---

## API Architecture

All APIs are AWS Lambda functions behind API Gateway, region `ap-south-1`.

### API URL pattern
```
https://<api-id>.execute-api.ap-south-1.amazonaws.com/<stage>/<function-name>
```

### All Known Endpoints (from store.js + page files)

| Purpose | Method | Constant / URL |
|---|---|---|
| Login | POST | `CL_User_Sign-in` |
| Register user | POST | `CL_User_Registartion` |
| Register coach (admin) | POST | `CL_Admin_Registration` |
| Admin sign-out | POST | `CL_Admin_Sign-Out` |
| Coach sign-out | POST | `CL_Coaches_Sign-Out` |
| Get all players | GET | `CL_Get_All_Players` |
| Add player | POST | `CL_Add_Players` |
| Update player | POST | `CL_Update_Player` |
| Delete player | DELETE | `CL_Delete_Player` |
| Get all coaches | GET | `CL_View_All_Coachs` |
| Update coach | PUT | `CL_Updating_Coaches` |
| Delete coach | DELETE | `CL_Deleting_Coaches` |
| Assign player to coach | POST | `CL_Assigned_Player_To_Coaches` |
| Update/remove/swap assigned player | POST | `CL_Update_Remove_Assigned_Player` |
| Get assigned players (coach) | POST | `CL_View_Assigned_Player` |
| Get learning pathways | GET | `CL_Get_LearningPathway` |
| Generate session card | POST | `CL_Session_Card_Generating` |
| Generate custom session card | POST | `CL_Custome_Sessioncard` |
| View session card | POST | `CL_View_Sessioncard` |
| Delete session card | POST | `CL_Deleting_Sessioncard` |
| View user profile | POST | `CL_View_User_Profile` |
| View rewards | GET | `CL_View_Reward` |
| Add reward | POST | `CL_Add_Reward` |
| Update reward | POST | `CL_Update_Reward` |
| Delete reward | DELETE | `CL_Delete_Reward` |

### API Response Shape — always check, it varies
```js
// Could be any of these shapes:
if (Array.isArray(data)) items = data;
else if (data.data) items = data.data;
else if (data.sessions) items = data.sessions;
else if (data.players) items = data.players;
else if (data.coaches) items = data.coaches;
else if (data.Items) items = data.Items;
else if (data.body && typeof data.body === 'string') items = JSON.parse(data.body);
```

---

## Data Models

### Player
```js
{
  playerId: string,          // from _id or playerId in DB
  playerName: string,
  fatherName: string,
  motherName: string,
  dateOfBirth: string,
  bloodGroup: string,
  address: string,
  phone: string,
  alternativeNumber: string,
  age: number,
  LearningPathway: string,   // curriculum name; maps player to pathway
  status: 'active' | 'inactive',
  totalPoints: number,       // all-time points earned (field: TotalPoints/totalPoints/Total_Points)
  PointBalance: number,      // redeemable balance remaining
  sessionCardIds: string[],  // IDs of generated session cards for this player
  primaryCoach: string       // coachId of assigned coach
}
```

### Coach
```js
{
  coachId: string,
  name: string,
  username: string,
  email: string,
  role: string[],
  specialization: string,
  assignedPlayers: string[],   // array of playerIds
  PlayersList: object[],       // full player objects (from API)
  totalSessions: number,
  joinDate: string
}
```

### Learning Pathway Session
```js
{
  LearningPathway: string,     // groups sessions under one curriculum
  session: number,             // 1-24=Foundation, 25-72=Intermediate, 73+=Advanced
  Topic: string,
  SessionType: 'Primary' | 'Secondary' | 'Advanced',
  Stage: string,               // auto-derived from session number
  Objective: string,
  activities: Activity[],
  sessionTakeaways: string[],
  totalPoints: number          // sum of activity.defaultPoints
}
```

### Activity (within a session or session card)
```js
{
  activitySequence: number,        // display order
  activityTitle: string,           // activity name (API field — not activityName)
  description: string,             // what the activity is
  story: string | string[],        // narrative context (may be array of paragraphs)
  instructionsToCoach: string[],   // step-by-step coach instructions
  code: { language: string, content: string } | null,
  project: string | null,
  aiTools: { toolName, usagePurpose, toolLink }[] | null,
  points: {
    total: number,
    evaluationCriteria: string[]
  },
  duration: number,               // minutes
  rating: number,                 // filled by coach during session (1-5)
  feedback: string | null         // coach feedback per activity
}
```

### Session Card
```js
{
  sessionCardId: string,       // _id in MongoDB
  playerId: string,
  session: number,             // which session number this card covers
  Topic: string,
  Objective: string,
  activities: Activity[],      // player-specific copy with rating/feedback fields
  status: string,              // 'Draft' | 'In Progress' | 'Completed' | 'Upcoming'
  typeOfSessioncard: string,   // card classification
  totalDuration: number,       // minutes
  rating: number,              // overall session rating (set by coach)
  coachComment: string         // overall session feedback
}
```

### Reward
```js
{
  rewardId: string,           // id or _id
  rewardName: string,
  rewardDescription: string,
  points: number,             // points required to redeem
  isActive: boolean
}
```

---

## State Management (Zustand store)

### Persisted state (survives page reload via localStorage `coachlife-store`)
```js
currentUser, isAuthenticated, userToken, lastVisitedPage, selectedPlayer
```

### In-memory state (reset on reload)
```js
players[], coaches[], learningPathway[], sessionHistory[], sessionDrafts[],
rewards[], redeemHistory[], coachesLoading, playersLoading,
showUnauthorizedModal, unauthorizedMessage, unauthorizedErrorCount
```

### Caching
- Players and coaches are cached for 5 minutes (`CACHE_DURATION = 5 * 60 * 1000`)
- Cache tracked via `playersLastFetchTime` / `coachesLastFetchTime`
- Call `clearCoachesCache()` to force refetch

### Key store actions
- `login(username, password)` — hashes PW, calls API, sets auth state
- `logout()` — clears all auth state + localStorage instantly
- `fetchPlayers()` — GET with cache; normalizes response to app shape
- `fetchCoaches()` — GET with cache; normalizes response
- `fetchAssignedPlayersForCoach(coachId)` — POST; returns players assigned to that coach
- `assignPlayerToCoach(playerId, coachId)` — POST; updates local state too
- `removePlayerFromCoach(payload)` — POST with `{playerId, fromCoachId}`
- `swapPlayerBetweenCoaches(playerId, fromCoachId, toCoachId)` — POST
- `fetchLearningPathway()` — GET; stores in `learningPathway[]`
- `fetchUserProfile(userId)` — POST; returns profile data

---

## Coding Conventions

- **All styling is inline styles** (JSX `style={{}}` objects) — never add CSS classes or Tailwind
- **Brand color:** `#060030ff` (dark navy) — primary buttons, focus borders, gradients
- **Error color:** `#EF4444` / `#DC2626`
- **Focus style:** `borderColor: '#060030ff'`, `boxShadow: '0 0 0 3px rgba(6, 0, 48, 0.1)'`
- **Hover effects** use `onMouseEnter` / `onMouseLeave` inline style mutations (not CSS pseudo-classes)
- **No TypeScript** — plain JS/JSX
- **No comments** unless the why is non-obvious
- Button gradients: `linear-gradient(135deg, #060030ff, #000000ff)` or `linear-gradient(135deg, #060030ff, #252c35)`

### Common fetch pattern
```jsx
const headers = {
  'Content-Type': 'application/json',
  ...(userToken && { 'userToken': userToken })
};
const response = await axios.get(URL, { headers });
```

### Extracting API data (multi-shape response)
```jsx
let items = [];
if (Array.isArray(data)) items = data;
else if (data.data) items = data.data;
else if (data.players) items = data.players;
else if (data.sessions) items = data.sessions;
else if (data.body && typeof data.body === 'string') items = JSON.parse(data.body);
```

### useStore hook
```jsx
const { userToken, currentUser } = useStore();
```

---

## Performance Conventions

- **`useMemo` for filtered/sorted lists** — wrap any `.filter().sort()` chain that runs on every render in `useMemo` with the correct deps (e.g., `[players, searchTerm, filter, sortBy]`)
- **`React.memo` for list-item components** — define card/row components at module level (outside the parent), wrap with `memo()`, and pass all needed values as props
- **`useCallback` for functions passed as props to memoized children** — especially functions that close over state (e.g., `shouldShowStartButton` closes over `sessions`)
- **`AbortController` in data-fetching `useEffect`** — always return `() => controller.abort()` as cleanup; ignore `CanceledError` in catch
- **Do not use `location.key` in `useEffect` deps** — page components already unmount/remount on navigation; `location.key` causes double-fetches

---

## Dev Commands

```bash
npm run dev      # start dev server (Vite)
npm run build    # production build
npm run lint     # ESLint
```

---

## Known Gotchas

- **`userToken` header, not `Authorization`** — using `Authorization` causes CORS preflight failures. The one exception is `customCardGenerate.jsx` which intentionally sends both headers (Postman-compatible pattern for that specific Lambda).
- **Response shape varies per endpoint** — always unwrap all known variants before using data
- **Some endpoints use `fetch`, some use `axios`** — both are present; this is intentional per-page choice, not a bug
- **`selectedPlayer` in Zustand is persisted** — so the session card manage page remembers the last selected player across navigations; reset on page load via `location.key` effect
- **Session card delete modal appears twice** in SessionCardManage.jsx (duplicate Modal blocks) — existing issue in code
- **`sessionHistory` in store has hardcoded demo data** — real session data comes from API, not this local array; the local array is used for demo/fallback only
- **Player `name` field normalization** — API returns `playerName`, store normalizes to both `name` and `playerName` for compatibility across components
- **401 threshold is 3 consecutive errors** — single 401s don't log out the user; only 3+ in a row trigger the modal
- **`activityTitle` not `activityName`** — the API uses `activityTitle` as the activity name field; legacy references to `activityName` exist in some components but the canonical field is `activityTitle`
- **`SessionCard` in SessionCardsView is `memo()`-wrapped at module level** — do not move it back inside the component body; it must stay outside to avoid being recreated on every parent render
- **`AbortController` pattern in axios** — axios throws `CanceledError` (not `AbortError`) when a request is aborted; always check `err.name !== 'CanceledError'` in catch blocks before setting error state
- **`LearningPathwayBuilder` fetches on `[userToken]` dep only** — `location.key` was intentionally removed; the component unmounts/remounts on each navigation so the effect still fires once per visit
- **Custom card `LearningPathway` comes from the player, not the browsed pathway** — `SessionCardManage` passes `LearningPathway` in navigation state; `customCardGenerate.jsx` reads it as `location.state?.LearningPathway`
