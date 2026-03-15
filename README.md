# F1 Live Tracker

A real-time Formula 1 race dashboard built with React and TypeScript. Connects to the free [OpenF1 API](https://openf1.org) to display live timing, car telemetry, tyre strategy, ERS data, and driver positions on an interactive track map — all in a dark F1 broadcast-style UI.

When no live race is happening (or the API is rate-limited), a full race **simulator** lets you replay the 2026 Australian Grand Prix lap by lap with smooth, sub-lap car positioning updated at 20fps.

---

## Features

### 7 Data Panels

| Tab | What it shows |
|-----|--------------|
| 🏁 **Race Tower** | Live leaderboard with gap to leader, last lap time, tyre compound + age, ERS charge bar, pit stop count, and position delta vs. qualifying grid (▲/▼) |
| 🗺 **Track Map** | Accurate Albert Park circuit SVG with DRS zones, sector markers, kerb markers, pit lane, and animated car dots with team colors positioned in real time |
| ⚡ **ERS / Battery** | Per-driver battery charge, mode (Harvest/Boost/Depleting/Balanced), estimated MJ, and Overtake Zone pairs within 1 second |
| 🔴 **Tyre Strategy** | Horizontal stint chart for all drivers showing compound, stint length, and current lap marker |
| ⚔️ **Head to Head** | Pick any two drivers — compare position, gap, last lap, pit stops, current compound, and a Chart.js lap time graph |
| 📈 **Gap Chart** | Chart.js rolling gap-to-leader chart for the top 6 over the last 15 laps |
| 📻 **Race Control** | Chronological feed of flags, safety cars, DRS calls, penalties, and team radio messages |

### Live Mode
- Polls all OpenF1 endpoints every 3 seconds using `Promise.allSettled` (no single endpoint failure kills the update)
- Vite dev proxy rewrites `/openf1/...` → `https://api.openf1.org/...` to bypass CORS
- Gracefully falls back to the most recent completed session when no race is live
- "LIVE" / "Archived Session" badge in the mode bar

### Simulator Mode
- **Zero API calls** — default mode, no 429 rate-limit errors
- Full 2026 Australian GP race data: 22 drivers, 57 laps, real finishing order, VSC periods, DNFs, DNS
- Continuous time-based simulation at 50ms ticks — car positions update smoothly within each lap, not just lap-by-lap
- Play / Pause / Speed (1×–20×) / Scrubber / Reset controls
- Realistic per-driver tyre strategies (Russell S→M under VSC, Ferrari S→H after missing VSC, Verstappen reversed M→S from P20)

### Track Map
- Hand-crafted Albert Park 2022+ SVG path using cubic bezier curves
  - T2–T3 chicane correctly placed immediately after T1
  - Long Jones Corner straight, T4–T5 lake entry, T5–T8 fast lakeside sweepers
  - T9–T10 flowing 2022 modification (replaced old slow hairpin)
  - T11–T12 back chicane, T13–T14 final complex
- DRS zone overlays, sector boundary dots, alternating red/white kerb markers, pit lane with box tick marks, chequered S/F line
- Car dots: team color fill, position number, name label for top 5, glow filter for top 3, pulse ring for leader, PIT badge when pitting
- Retired drivers (DNF) disappear from the track after their retirement lap
- Side leaderboard panel with gap, tyre dot, last lap time, and ERS bar

---

## Tech Stack

- **React 19 + TypeScript** via Vite 8
- **Tailwind CSS v4** (`@tailwindcss/vite` plugin)
- **Chart.js** via `react-chartjs-2` (Gap Chart, Head to Head)
- **OpenF1 REST API** — free, no auth required
- SVG path animations via `SVGPathElement.getPointAtLength()`

---

## Getting Started

```bash
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173).

The app starts in **Simulator** mode by default. Click **🔴 Live** in the mode bar to switch to live OpenF1 data. Your choice is saved in `localStorage`.

### Available Scripts

```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build
npm run lint     # ESLint
```

---

## Data Source

All live data comes from the [OpenF1 API](https://openf1.org) — a free, community-maintained API that provides real-time F1 timing, telemetry, and session data.

Endpoints used: `/position`, `/intervals`, `/laps`, `/car_data`, `/pit`, `/race_control`, `/weather`, `/location`, `/drivers`

The Vite dev server proxies these requests through `/openf1/...` to avoid CORS issues in development.

---

## Simulator Data: 2026 Australian GP

The built-in simulator replicates Round 1 of the 2026 FIA Formula One World Championship.

**Result:** Russell wins (Mercedes 1–2 with Antonelli), Leclerc P3, Hamilton P4, Norris P5, Verstappen P6 (started P20 after Q1 crash, set fastest lap)

**Key events simulated:**
- VSC 1 (laps 11–14): Hadjar engine failure at T1 → Mercedes double-stacks under VSC (lap 12)
- Ferrari missed VSC 1 window → pitted under VSC 2 onto harder tyres
- VSC 2 (laps 16–18): Bottas fuel system failure at T12
- DNF: Alonso (power unit, lap 15)
- DNS: Piastri (locked rear axle on formation lap), Hülkenberg (technical)
- Debris yellow flag sector 2 (lap 27)
- Stroll 5-second time penalty for unsafe pit release (lap 46)

Lap times are generated deterministically (no `Math.random`) with tyre degradation (+0.025s/lap), VSC pace penalties, traffic penalties for Verstappen's opening stint, and realistic pit stop time loss.
