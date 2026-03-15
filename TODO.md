# F1 Live Tracker — Project TODO

## 🔴 High Priority (Core Improvements)

### Simulation / Mock Data
- [ ] Add **sector times** to mock laps (duration_sector_1/2/3) — required for sector analysis
- [ ] Add **pit stop durations** to mockPits (realistic 2.2–4.5s pitstop loss)
- [ ] Add **realistic tyre compounds** per driver (not just SOFT→MEDIUM→HARD rotation) — use actual 2026 Australian GP strategy
- [ ] Add **team radio messages** to mock data (engineer calls to drivers, e.g. "box box", "push now")
- [ ] Fix `totalLaps` hardcoded to 58 in `useOpenF1.ts` — should be 57 for Australian GP

### Track Map
- [ ] Fix car positioning gaps — cars jump too much between track positions; add interpolation
- [ ] Add **marshal sector indicators** (yellow flag zones when incidents happen)
- [ ] Show **pit lane cars** moving through pit lane visually during pit stops

### Race Tower
- [ ] Add **position change delta** (▲2 / ▼1 arrows with color) since race start or last lap
- [ ] Highlight rows when a driver **pits** (brief flash/badge)
- [ ] Show **pit stop count** column

---

## 🟡 Medium Priority (New Features)

### New: Sector Analysis Tab
- [ ] Add a new **"⏱ Sectors"** tab
- [ ] Show S1/S2/S3 times per driver per lap (from lap data)
- [ ] Purple highlight for personal/overall fastest sector
- [ ] Mini trend chart for each sector over last 5 laps

### New: Telemetry Tab
- [ ] Add a **"📡 Telemetry"** tab
- [ ] Speed trace chart (km/h over distance) from `car_data`
- [ ] Throttle/brake overlay (0–100%)
- [ ] Gear chart
- [ ] DRS activation markers
- [ ] Compare two drivers side by side

### Gap Chart
- [ ] Add **pit stop markers** on the chart (vertical dotted lines when a driver pits)
- [ ] Show full race history option, not just last 15 laps
- [ ] Add **undercut window** shading (gap < pit loss = undercut possible)

### Tyre Strategy
- [ ] Add **pit duration** displayed on pit stop markers
- [ ] Add **predicted pit window** range for drivers not yet pitted (dim shaded area)
- [ ] Show tyre degradation rate estimate (lap time delta per stint lap)

### Head to Head
- [ ] Expand lap history from 5 → configurable (5/10/20/all)
- [ ] Add **sector time breakdown** comparison table (S1/S2/S3)
- [ ] Add **DRS usage** comparison per lap

### ERS Panel
- [ ] Show **charge direction** (▲ harvesting / ▼ deploying) next to each driver
- [ ] Add **mini sparkline** of charge over last 10 laps
- [ ] Add **Overtake Mode countdown** estimate (seconds of boost remaining)

### Header
- [ ] Add **wind speed + direction** to weather strip (data already fetched, just not displayed)
- [ ] Add **session type breadcrumb** (Practice 1 / Qualifying / Race)
- [ ] Show **cars remaining** count (20 started, X running, Y DNF)

### Team Radio (Race Control)
- [ ] Add **filter buttons** (All / Flags / Safety Car / DRS / Penalties)
- [ ] Distinguish **team radio** messages from **race control** messages visually
- [ ] Add actual team radio messages from mock data once added

---

## 🟢 Lower Priority (Polish & Nice-to-Haves)

### Data Source: F1 Live Timing
- [ ] Integrate `livetiming.formula1.com/static/` for historical session data (no auth needed)
  - Much richer than OpenF1: real sector times, mini-sectors, real tyre compounds
  - Drop-in for when no live race is happening
- [ ] Explore SignalR live streaming integration for race weekends (requires f1.com auth)

### Track Map Polish
- [ ] Add **corner names** (Turn 1 "The Loop", Turn 3 "Jones Corner", etc.) on hover
- [ ] Animate **DRS detection loop** flash when DRS activated
- [ ] Show **gap bubble** between close cars on track (e.g. "0.8s" between P1/P2 car dots)

### Race Tower Polish
- [ ] **Fastest lap** row highlight (purple) for the driver with overall fastest lap
- [ ] **DNF/DNS** styling — gray out retired drivers with ❌ instead of position
- [ ] Show **laps behind** for lapped drivers instead of gap in seconds

### Simulation
- [ ] Add **lap-by-lap replay mode** — step forward/back one lap at a time
- [ ] Add a **Formation Lap** animation before race start
- [ ] Save/restore simulation position (localStorage) so refresh doesn't reset

### General UX
- [ ] **Mobile layout** — current flex layout breaks on small screens; make tabs scroll, resize panels
- [ ] Add **keyboard shortcuts** (Space = play/pause, left/right arrow = seek)
- [ ] Add a **Settings panel**: choose which session to load, toggle simulation vs live
- [ ] Dark/light mode toggle

### Performance
- [ ] Memoize `deriveState()` more aggressively — currently runs every 50ms tick
- [ ] Throttle side panel rerender in TrackMap (currently updates every tick)
- [ ] Lazy-load Chart.js tabs (GapChart, HeadToHead) — only load when tab is active

---

## 🐛 Known Bugs

- [ ] Tyre compounds in simulation cycle SOFT→MEDIUM→HARD artificially regardless of actual strategy
- [ ] `useOpenF1` has no deduplication key for race control messages (can show duplicates)
- [ ] `HeadToHead` pit stop count uses `stints.length - 1` which is off-by-one if driver hasn't pitted
- [ ] `computeTrackPositions` doesn't account for retired drivers (they stay frozen on track)
- [ ] `SimulatorControls` progress bar has `position: absolute` but parent isn't `position: relative` (may mis-align)
