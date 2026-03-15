# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
npx tsc --noEmit  # Type check without building
```

## Architecture

**Stack:** React + TypeScript (Vite), Tailwind CSS, Chart.js via `react-chartjs-2`. No backend — all data fetched directly from the OpenF1 REST API.

**Data flow:**
- `useOpenF1` (`src/hooks/useOpenF1.ts`) is the single master polling hook. It runs a `setInterval` every 3 seconds, fetches all OpenF1 endpoints in parallel with `Promise.allSettled`, accumulates laps/pits/race control in refs, and derives tyre stints. On mount it resolves the active session (`/sessions?session_key=latest`), falling back to `session_key=9222` (2024 Monaco GP) when no live race is running or the API fails.
- `useErsEstimator` (`src/hooks/useErsEstimator.ts`) maintains per-driver ERS state in a `useRef` map, updating on every car_data batch. ERS mode is inferred from throttle/brake/speed deltas.
- All components receive the full `F1State` object as a `state` prop — no prop drilling through intermediaries.

**Key state shape** (`src/types/f1.ts`):
- `positions` / `intervals` — latest per-driver (deduplicated by driver_number)
- `laps` / `pits` / `raceControl` — accumulated arrays across all polls
- `stints` — derived `DriverStints` map built from laps + pits
- `ersStates` — per-driver `{ charge, mode, estimatedMJ }` from the estimator

**Panels (all tabs in `App.tsx`):**
| Tab | Component | Notes |
|-----|-----------|-------|
| Race Tower | `RaceTower.tsx` | Sorted by position; ERS bar inline |
| Track Map | `TrackMap.tsx` | SVG; uses `/location` x/y coords |
| ERS / Battery | `ERSPanel.tsx` | Charge bars + Overtake Zone (pairs within 1s) |
| Tyre Strategy | `TyreStrategy.tsx` | Horizontal stint bars across race distance |
| Head to Head | `HeadToHead.tsx` | Driver selects + stat table + Chart.js line |
| Gap Chart | `GapChart.tsx` | Chart.js, top 6, last 15 laps |
| Race Control | `TeamRadio.tsx` | Styled by flag/SC/DRS type, newest first |

**Utilities:**
- `teamColors.ts` — team name → hex; uses OpenF1 `team_colour` field when available
- `tyreUtils.ts` — compound → color/label, `formatLapTime`, `formatGap`, sector colors

**Tyre compound colors:** Soft `#FF3B30`, Medium `#FDE74C`, Hard `#E0DCDC`, Intermediate `#39B54A`, Wet `#0067FF`

## OpenF1 API

Base URL: `https://api.openf1.org/v1`
All endpoints use `?session_key=latest` for live races or a specific integer key for historical sessions. Returns JSON arrays. The API can return 502 transiently — the app handles this by keeping last-known data and showing a "Stale data" badge.
