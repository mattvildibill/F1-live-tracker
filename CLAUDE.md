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

**Stack:** React + TypeScript (Vite), Tailwind CSS, Chart.js via `react-chartjs-2`. No backend — all data fetched directly from the OpenF1 REST API and the Jolpica-F1 API (Ergast successor, for championship standings/calendar).

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
| Race Control | `TeamRadio.tsx` | Filter buttons; merges race-control feed with playable `/team_radio` audio |
| Sectors | `SectorAnalysis.tsx` | Best S1/S2/S3, ideal lap; synthesizes deterministic splits when session lacks sector timing |
| Telemetry | `Telemetry.tsx` | On-demand traces via `useLapTelemetry`; synthetic in sim mode (`utils/syntheticTelemetry.ts`) |
| Pit Lane | `PitLane.tsx` | Stop log, durations, fastest stop, yet-to-stop board |
| Championship | `Championship.tsx` | Jolpica standings/calendar via `useJolpica`; renders in both view modes |

**Utilities:**
- `teamColors.ts` — team name → hex; uses OpenF1 `team_colour` field when available
- `tyreUtils.ts` — compound → color/label, `formatLapTime`, `formatGap`, sector colors

**Tyre compound colors:** Soft `#FF3B30`, Medium `#FDE74C`, Hard `#E0DCDC`, Intermediate `#39B54A`, Wet `#0067FF`

## OpenF1 API

Base URL: `https://api.openf1.org/v1` (proxied at `/openf1` in dev)
Jolpica base: `https://api.jolpi.ca/ergast/f1` (proxied at `/jolpica` in dev; CORS-enabled so prod fetches direct)

**Additional hooks:**
- `useJolpica` — standings/calendar/last-result, 5-min refresh
- `useLapTelemetry(state, driverNumber, lapNumber)` — on-demand `/car_data` for one lap window (bounded by `date_start` + `lap_duration`); generates deterministic synthetic traces when `session_key === 9500` (simulator)
- `useOpenF1(enabled, sessionKeyOverride)` — pass a session key from `SessionPicker` to replay any historical session; accumulators reset on session change
All endpoints use `?session_key=latest` for live races or a specific integer key for historical sessions. Returns JSON arrays. The API can return 502 transiently — the app handles this by keeping last-known data and showing a "Stale data" badge.
