# CoachLife

Web application for **Technology Garage**, an online learning studio for technology education. CoachLife is the operational interface for administrators and coaches: admins configure and manage everything; coaches run sessions with students through session cards.

- **Live:** https://coachlife-aa085.web.app

## Core concepts

| Concept | Meaning |
|---|---|
| **Player** | A student enrolled at Technology Garage |
| **Coach** | An instructor assigned to one or more players |
| **Learning Pathway** | A curriculum (e.g. "AI Foundation for Kids") of ordered sessions |
| **Session** | One unit of a pathway — topic, objective, and activities |
| **Session Card** | A player-specific copy of a session, generated per scheduled session |
| **Activity** | A single task within a session — carries points and accepts feedback |
| **Points** | Earned by completing activities; redeemable against rewards |

Session stages derive from the session number: 1–24 Foundation · 25–72 Intermediate · 73+ Advanced.

## Features

**Admin** — manage players, coaches, and coach↔player assignments; build Learning Pathways; full session-card management (generate standard/custom cards, view/edit/soft-delete); rewards catalog and redemption history.

**Coach** — view assigned players; run the batch/class-room flow (attendance → coach each player → complete); work through session cards (rate activities, per-activity and overall feedback); Pending Queue and Home Tasks; carry-forward of unfinished activities into the next session; leaderboard scoped to assigned players.

**Shared** — role-aware dashboard, leaderboard, profile with real change-password.

## Session flow

1. A session card is generated for a player (standard next session, or a custom card) from their assigned pathway.
2. The coach starts the session (card → In Progress) and works through each activity in order, rating and giving feedback.
3. On submit, the card is Completed and points are credited. Activities marked "Not Completed" become Home Tasks; those flagged "carry forward" are pulled into the next generated card.
4. Deleting a card **soft-deletes** it (kept as an `empty` tombstone so the session sequence never drifts); it can be refilled in place.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM v7 |
| State | Zustand v5 (`persist` middleware) |
| HTTP | Axios / native `fetch` |
| Icons | Lucide React · Charts: Recharts |
| Crypto | crypto-js (SHA256 password hashing) |
| Styling | Inline styles throughout |
| Backend | AWS Lambda + API Gateway (region `ap-south-1`), MongoDB (`CoachLife` DB) |
| Hosting | Firebase Hosting |

## Project structure

```
frontend/
  src/
    App.jsx            # Routes (public / admin / coach), lazy-loaded
    context/store.js   # Zustand store: auth, players, coaches, API actions
    components/        # Shared UI (Layout, Sidebar, ProtectedRoute, ...)
    pages/{admin,coach,common}/
    utils/             # statusGroups, apiPerformance, ...
  firebase.json        # Hosting config (public: dist)
backend/               # One folder per AWS Lambda (Python)
CLAUDE.md              # Detailed architecture & conventions reference
```

## Auth

Passwords are SHA256-hashed (CryptoJS) before being sent. On login the user object + `userToken` are stored in Zustand + `localStorage`; an Axios interceptor attaches the `userToken` header to every request. Roles live on `currentUser.roles`; `ProtectedRoute` guards by role. After 3 consecutive 401s the session-expiry modal is shown.

## Development

```bash
cd frontend
npm install
npm run dev      # start Vite dev server
npm run build    # production build → dist/
npm run lint     # ESLint
```

## Deployment

**Frontend** — build then deploy to Firebase Hosting:

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

**Backend** — each Lambda is deployed independently (zip or container image) to AWS in `ap-south-1`; source lives under `backend/<FunctionName>/`.

## Notes

- API response shapes vary per endpoint — unwrap all known variants (`data`, `players`, `sessions`, `Items`, stringified `body`, …) before use.
- The activity name field is `activityTitle` (not `activityName`).
- Use the `userToken` header, not `Authorization: Bearer` (avoids CORS preflight issues).

See [CLAUDE.md](CLAUDE.md) for the full architecture, data models, endpoint list, and coding conventions.
