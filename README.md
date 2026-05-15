# VCT Fantasy — Valorant Champions Tour Fantasy App

A full-stack fantasy esports app built with React + Firebase, modelled on Premier League Fantasy Football but for VCT. Live scoring, private leagues, gameweek system, chips, H2H, and more.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, React Router v6 (HashRouter) |
| Backend | Firebase Cloud Functions (Node 18) |
| Database | Firestore (real-time listeners) |
| Auth | Firebase Auth — Google sign-in |
| Data | vlrggapi (axsddlr) — unofficial VLR.gg REST API |
| Charts | Recharts |
| Fonts | Rajdhani (headings), Inter (body) |

---

## Quick Start

### 1. Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Create project**
2. Enable **Authentication** → Sign-in methods → Google
3. Enable **Firestore Database** (start in production mode)
4. Enable **Cloud Functions** (requires Blaze plan for external network calls)
5. Register a **Web App** → copy the config

### 2. Environment variables

```bash
cp .env.example .env.local
# Fill in your Firebase config values
```

### 3. VLR API (important)

The public Vercel instance (`https://vlrggapi.vercel.app`) is often down due to free-tier limits.
You have three options:

**Option A — Self-host (recommended)**
```bash
git clone https://github.com/axsddlr/vlrggapi
cd vlrggapi
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py        # Runs at http://127.0.0.1:3001
```
Then set your Functions config:
```bash
firebase functions:config:set vlr.base_url="http://127.0.0.1:3001"
```
For production, deploy to Fly.io / Railway / any Python host.

**Option B — Alternative hosted instance**
```bash
firebase functions:config:set vlr.base_url="https://vlr.orlandomm.net/api/v1"
```
Note: v1 endpoint shapes differ slightly; the normaliser in `vlrApi.js` handles both.

**Option C — Use the Vercel instance (may be down)**
No config needed — it's the default.

### 4. Install and run

```bash
# Install React app deps
npm install

# Install Functions deps
cd functions && npm install && cd ..

# Start dev server
npm start

# In another terminal — start Firebase emulators
npx firebase emulators:start
```

### 5. Deploy

```bash
# Build React app
npm run build

# Deploy everything
npx firebase deploy
```

---

## Project Structure

```
vct-fantasy/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.js                    # Router + auth guard
│   ├── index.js                  # React entry
│   ├── firebase.js               # Firebase init
│   ├── context/
│   │   └── AppContext.js         # Global state (user, GW, leagues)
│   ├── hooks/
│   │   └── useVLR.js             # Data hooks with auto-refresh
│   ├── utils/
│   │   ├── vlrApi.js             # All VLR API calls + scoring helpers
│   │   └── firestore.js          # All Firestore operations
│   ├── components/
│   │   ├── AppShell.jsx          # Sidebar + topbar + mobile nav
│   │   └── UI.jsx                # Reusable components
│   ├── pages/
│   │   ├── Dashboard.jsx         # Home screen
│   │   ├── LiveMatches.jsx       # Live scores + match detail
│   │   ├── MyTeam.jsx            # Team builder / draft
│   │   ├── PlayerScout.jsx       # Full player stats table
│   │   ├── Leagues.jsx           # Create/join + standings + H2H
│   │   ├── Profile.jsx           # User stats + achievements
│   │   ├── ScoringRules.jsx      # Points breakdown
│   │   └── Login.jsx             # Google auth
│   └── styles/
│       └── index.css             # Global dark theme
├── functions/
│   ├── package.json
│   └── src/
│       └── index.js              # Cloud Functions
├── firebase.json                 # Hosting + Functions config
├── firestore.rules               # Security rules
├── firestore.indexes.json        # Composite indexes
├── .env.example                  # Env template
└── .firebaserc                   # Project ID
```

---

## Firestore Schema

```
/users/{uid}
  displayName, email, photoURL, teamName, totalPoints, bestRank, bestGW

/gameweeks/{gwId}
  name, status (upcoming|active|complete), startDate, endDate,
  deadlineDate, matchIds[], number

/leagues/{leagueId}
  name, createdBy, members[], inviteCode, budgetEnabled,
  budgetTotal, freeTransfersPerGW, transferCostPts

  /rosters/{userId}
    players[], captainId, budget, totalPoints,
    transfersThisGW, wildcardsLeft,
    chips: { tripleDuelist, allIn, scout, analystMode }
    activeChip, chipActivatedGW

  /gameweekScores/{gwId_userId}
    userId, gameweekId, leagueId, totalPoints, playerBreakdowns[]

  /transfers/{transferId}
    userId, outPlayerId, inPlayerId, isFree, costPts, timestamp

  /h2h/{pairId}
    player1, player2, gwId, result (w|l|d|null)

/notifications/{notifId}
  userId, type, message, metadata, read, createdAt

/gameweekHistory/{userId_gwId}
  userId, gameweekId, leagueId, points, gwNumber
```

---

## Scoring System

| Event | Points |
|---|---|
| Kill | +3 |
| Death | −1 |
| Assist | +1.5 |
| First Blood (FK/R ≥ 0.15) | +2 |
| ACS 200+ | +5 |
| ACS 250+ | +10 |
| ACS 300+ | +20 |
| HS% 25%+ | +3 |
| HS% 35%+ | +6 |
| Clutch win (clutch% ≥ 50) | +5 |
| Top 3 ACS in series | +10 |
| Player of Game (top ACS) | +25 |
| Match Win | +10 |
| Flawless Map (13–0) | +15 |
| Captain | ×2 |
| Triple Duelist chip + Captain | ×3 |
| All In chip | ×2 all players |

---

## Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `vlrProxy` | Callable (HTTPS) | Proxies all VLR API requests to avoid CORS |
| `scoreGameweek` | Callable (HTTPS) | Manually trigger GW scoring for a league |
| `autoScoreCheck` | PubSub (every 15 min) | Auto-detects completed GWs and scores them |
| `getPlayerOwnership` | Callable (HTTPS) | Returns % of rosters each player appears in |

---

## VLR API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /v2/match?q=live_score` | Live matches |
| `GET /v2/match?q=upcoming` | Upcoming fixtures |
| `GET /v2/match?q=results` | Recent results |
| `GET /v2/match/{id}` | Full match detail + player stats |
| `GET /v2/stats?region=X&timespan=Y` | Player stats by region |
| `GET /v1/rankings/{region}` | Team rankings (fixture difficulty) |

All calls go through the `vlrProxy` Firebase Function so the API base URL stays server-side.

---

## Adding a Gameweek (Admin)

Use the Firebase Console or a script to write to `/gameweeks`:

```js
await addDoc(collection(db, 'gameweeks'), {
  name: 'VCT Americas — Week 4',
  status: 'upcoming',           // upcoming → active → complete
  number: 4,
  startDate: Timestamp.fromDate(new Date('2025-04-21')),
  endDate:   Timestamp.fromDate(new Date('2025-04-25')),
  deadlineDate: Timestamp.fromDate(new Date('2025-04-21T18:00:00')),
  matchIds: ['12345', '12346', '12347'],  // VLR match IDs
});
```

Change `status` to `'active'` when the GW starts. The `autoScoreCheck` function will detect when all matches complete and score automatically. Or call `scoreGameweek` manually.

---

## Known Limitations

- VLR API public instance may be unavailable (self-host recommended — see above)
- Player photos not available from VLR API; initials avatars used instead  
- Match IDs for gameweeks must be added manually by an admin
- ACS-based scoring is approximate for live matches; final scores set on completion

---

## License

MIT — use freely, credit appreciated.
