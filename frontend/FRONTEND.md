# CoachLife — Frontend Reference

React 19 + Vite 7 app. All styling is inline (`style={{}}`). No Tailwind, no CSS modules.

---

## Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # ESLint
```

---

## Structure

```
frontend/src/
  App.jsx               # All routes (lazy-loaded)
  main.jsx              # Entry point
  context/
    store.js            # Zustand store — all state + API actions
  components/           # Shared UI
  pages/
    admin/              # Admin-only pages
    coach/              # Coach-only pages
    common/             # Public + shared pages
  utils/
    apiPerformance.js   # API timing helpers
```

---

## Pages

### Admin (`/admin/...`)
| File | Route | Purpose |
|---|---|---|
| `Dashboard.jsx` | `/admin` | Admin dashboard |
| `AdminProfile.jsx` | `/admin/profile` | Admin profile |
| `Players.jsx` | `/admin/players` | Manage all players |
| `Coaches.jsx` | `/admin/coaches` | Manage coaches |
| `AssignPlayers.jsx` | `/admin/assign-players` | Coach ↔ player mapping |
| `SessionCardManage.jsx` | `/admin/session-card` | View/generate/delete session cards |
| `ViewSessionCard.jsx` | `/admin/view-session-card/:id` | Read-only card view |
| `EditSessionCard.jsx` | `/admin/edit-session-card/:id` | Edit a card |
| `customCardGenerate.jsx` | `/admin/custom-generate-card` | Custom card creation |
| `LearningPathwayBuilder.jsx` | `/admin/learning-pathway` | List/delete pathway sessions |
| `AddPathway.jsx` | `/admin/learning-pathway/add` | Add pathway session |
| `ViewPathway.jsx` | `/admin/learning-pathway/:id/view` | Read-only session view |
| `EditPathway.jsx` | `/admin/learning-pathway/:id/edit` | Edit pathway session |
| `Rewards.jsx` | `/admin/rewards` | Rewards catalog CRUD |
| `RedeemHistory.jsx` | `/admin/redeem-history` | Redemption log |
| `Attendance.jsx` | `/admin/attendance` | Batch attendance sheet — Excel-like table, manual override, complete session |

### Coach (`/coach/...`)
| File | Route | Purpose |
|---|---|---|
| `CoachDashboard.jsx` | `/coach` | Coach dashboard |
| `CoachProfile.jsx` | `/coach/profile` | Coach profile |
| `MyPlayers.jsx` | `/coach/players` | Assigned players list |
| `PlayerDetail.jsx` | `/coach/player/:playerId` | Player profile |
| `PlayerSessions.jsx` | `/coach/player/:playerId/sessions` | Player session history |
| `StartSession.jsx` | `/coach/start-session` | Pick player to start session |
| `SessionCardsView.jsx` | `/coach/start-session/:playerId` | View player's session cards |
| `SessionDetail.jsx` | `/coach/session/:sessionId` | Active session — rate activities, submit |
| `viewCompletedSessionCard.jsx` | `/coach/view-completed-session/:sessionId` | Completed session read-only |
| `PastSessions.jsx` | `/coach/past-sessions` | All past sessions |

### Common / Public
| File | Route | Purpose |
|---|---|---|
| `Home.jsx` | `/` | Landing page |
| `Login.jsx` | `/login` | Login |
| `Register.jsx` | `/register` | Register |
| `LeaderBoard.jsx` | `/leaderboard` | All players ranked by points |
| `Dashboard.jsx` | `/admin` or `/coach` | Role-aware dashboard |
| `UserProfile.jsx` | shared | Common profile view |
| `NotFound.jsx` | `*` | 404 page |

---

## Components

| File | Purpose |
|---|---|
| `Layout.jsx` | Page shell — wraps Sidebar + Navbar |
| `Sidebar.jsx` | Role-aware nav links |
| `Navbar.jsx` | Top bar |
| `ProtectedRoute.jsx` | Role-based route guard |
| `UnauthorizedModal.jsx` | Shown on 3 consecutive 401s |
| `SessionCard.jsx` | Session card display |
| `ActivityCard.jsx` | Single activity within a session |
| `RatingStars.jsx` | Star rating input (1–5) |
| `RichTextEditor.jsx` | Rich text input for session content |
| `Modal.jsx` | Reusable modal wrapper |
| `Toast.jsx` | Ephemeral notification banner |
| `SkeletonLoader.jsx` | Loading placeholders |
| `Badge.jsx` | Status/label badge |
| `Button.jsx` | Shared button |
| `Card.jsx` | Card container |
| `Input.jsx` | Form input |
| `Select.jsx` | Dropdown select |
| `Table.jsx` | Data table |
| `ProgressBar.jsx` | Progress indicator |
| `ToggleSwitch.jsx` | Toggle input |

---

## State — Zustand Store (`context/store.js`)

### Persisted (survives reload via `coachlife-store` in localStorage)
- `currentUser`, `isAuthenticated`, `userToken`, `lastVisitedPage`, `selectedPlayer`

### In-memory (reset on reload)
- `players[]`, `coaches[]`, `learningPathway[]`, `rewards[]`, `redeemHistory[]`
- `playersLoading`, `coachesLoading`
- `showUnauthorizedModal`, `unauthorizedMessage`, `unauthorizedErrorCount`

### Key actions
- `login(username, password)` — SHA256 hashes PW, calls API, sets auth
- `logout()` — clears all state + localStorage
- `fetchPlayers()` — cached 5 min
- `fetchCoaches()` — cached 5 min
- `fetchAssignedPlayersForCoach(coachId)`
- `fetchLearningPathway()`
- `fetchUserProfile(userId)`

---

## Conventions

- **Auth header:** `userToken` (not `Authorization: Bearer`) — avoids CORS preflight
- **Brand color:** `#060030ff`
- **Hover:** `onMouseEnter` / `onMouseLeave` inline mutations
- **Fetch pattern:** axios with `{ headers: { 'Content-Type': 'application/json', userToken } }`
- **Response unwrapping:** check `data`, `data.data`, `data.players`, `data.sessions`, `data.Items`, `JSON.parse(data.body)` — shape varies per endpoint
- **Performance:** `useMemo` for filtered lists, `React.memo` for list-item components, `useCallback` for props passed to memo'd children, `AbortController` in fetch effects
- **AbortController + axios:** catch `CanceledError` (not `AbortError`)
