# PantriPal

Smart household pantry manager — track inventory, reduce waste, and never run out of essentials.

## Features

- **Inventory tracking** — manage items across multiple storage spaces and shelves
- **Smart reordering** — automatic low-stock alerts with configurable reorder points
- **Expiry monitoring** — waste-risk warnings for items nearing expiration
- **Bill scanning** — photograph receipts and auto-populate inventory via AI
- **Meal planning** — "What can I cook?" mode suggests recipes from current stock
- **Insights dashboard** — ABC/VED analysis, price trends, consumption predictions
- **Baby essentials** — dedicated tracking for diapers, formula, and baby supplies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| Backend | Express, Vercel Serverless Functions |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| AI | Anthropic Claude API (bill scanning, meal suggestions) |
| Testing | Vitest (91 unit tests), Playwright (E2E) |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

## Environment Variables

Create a `.env` file in the project root:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
ANTHROPIC_API_KEY=...
```

## Project Structure

```
src/
  App.jsx              # Root component, routing, state
  tabs/                # Tab views (Home, Spaces, Add, Used, Insights)
  components/          # Shared components (NavBar)
  lib/                 # Shared logic modules (insightsLogic)
  test/                # Vitest unit tests
  pantriUtils.js       # Utility functions
  pantriConstants.js   # App constants, demo data
api/
  analyze.js           # Serverless AI endpoint (auth-protected)
e2e/
  app.spec.js          # Playwright E2E tests
firestore.rules        # Firestore security rules
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run serve` | Start Express server |

## License

Private — all rights reserved.
