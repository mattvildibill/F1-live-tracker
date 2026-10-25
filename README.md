# F1 Live Tracker

I started building this while watching a race because I wanted to see more timing and telemetry than the TV broadcast showed. It grew into a race-weekend dashboard and recorded-race replay, built with React 19, TypeScript and Vite. Production: https://f1.mattvildibill.com. Featured on https://mattvildibill.com.

## Modes

- **Live / Weekend** (default): selects the current/upcoming Grand Prix from the current-year Jolpica calendar, retaining the event through race day for delayed starts. Shows scheduled local start time, weekend sessions, qualifying classification, published championship standings and regional Open-Meteo conditions. Qualifying is explicitly distinguished from the final penalty-adjusted grid.
- **Race replay**: select a season (1996 onward) and completed race. Loads all pages of recorded Jolpica lap timing, then supports play, pause, reset, speed and lap scrubbing. Starts with the selected race's actual grid. Position history and driver comparisons use recorded lap-end positions/times. Final classification uses published results (including penalties/retirements). Data availability varies by race.
- **Offline demo**: explicitly synthetic Australian GP scenario, separate from Live. Runs locally without OpenF1 requests; other independent panels may fetch calendar/standings. It is not an exact historical reconstruction.

## Data availability and accuracy

OpenF1 historical access is free, but authenticated access is required during live windows. At the October 2026 audit the provider returned HTTP 401 for global API access during a live session, including requests for past sessions. This static deployment does not hold an OpenF1 credential. When OpenF1 is unavailable, automatic Live mode falls back to ESPN’s public Grand Prix leaderboard through `/api/live-timing`. It refreshes every 20 seconds and reports provider delays. Starting grid, classification, lap count and grid changes use published data; detailed telemetry, gaps, lap times, tyres and GPS remain unavailable. Explicitly browsed OpenF1 sessions retain their identity and never switch to a different race. Live timing is **not guaranteed**; official timing remains linked while independent weekend data is retained. It never substitutes a demo into Live.

- All OpenF1 consumers share a paced queue (at least 2.1 seconds between requests), with timeouts, cancellation, backoff and tab-visibility pauses for polling. Core failures retain the last successful data and mark it stale. Optional feed failures are explicit. Core timing is published before optional feeds finish. Secondary feeds are selected by the active panel; no overlapping polling cycles or full-session car/location downloads.
- GPS outlines, when available, use one bounded recorded lap for an actual driver. Historical replay has a position-history visualization, not invented GPS. The Melbourne map only belongs to the explicit demo. Live telemetry traces use elapsed lap percentage rather than pretending time samples are measured distance; only the synthetic demo has its authored distance profile.
- Unknown tyre compounds, missing sectors, gaps, pit durations and battery states remain unknown. Only the demo includes synthetic sectors/ERS/telemetry.
- Pace comparison shows per-lap differences against the currently leading driver, **not measured gaps**.
- Open-Meteo conditions are regional model estimates, not track sensor measurements; observation/model timestamps are shown. No weather-based race-control claims.
- Jolpica updates after source publication; qualifying order may differ from the starting grid. Calendar countdowns do not imply a delayed race has begun.

## Development and verification

```sh
npm ci
npm run dev
npm run build
node --test tests/*.test.mjs
```

Requires Node 24 for the native TypeScript test imports. Production deploys automatically from GitHub `main` through Vercel. `vercel.json` retains the portfolio frame-ancestor policy. The tracker loads its heavyweight analysis panels on demand. `?mode=demo&panel=tower&time=120` opens a useful paused synthetic race without external feed requests. Copy view link preserves the selected mode/panel and paused demo time; recorded replay links also retain year and round, while browsed OpenF1 sessions retain their session key. A reset shows the starting grid, and backgrounding the demo pauses it. Five core views are visible in the desktop navigation; More analysis keeps the remaining panels accessible. On phones, the View selector offers every supported panel without a horizontal tab strip.

Regression tests cover weekend/date selection, delayed starts, session status, replay identity and grid, seeking without future-lap leakage, final classification, string lap deficits, and race-control flags. Browser verification should cover Live unavailable state, latest replay, a different season/race, playback/seek/reset, narrow layouts, and the production portfolio iframe.
