import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { F1State, Position, Interval, DriverStints, StintInfo } from '../types/f1';
import {
  mockF1State, mockLaps, mockPits, mockRaceControl, mockErsStates,
  TOTAL_LAPS, DRIVER_CONFIGS,
} from '../mocks/australianGP2026';

// ─── Types ────────────────────────────────────────────────────────────────────
export type PlaybackSpeed = 1 | 2 | 5 | 10 | 20;
export const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10, 20];

// Sim-seconds advanced per 50ms tick at each speed label
const SIM_SEC_PER_TICK: Record<PlaybackSpeed, number> = {
  1:  0.5,   // ~10 sim-sec/real-sec  → 1 lap ≈ 16s real
  2:  1.5,   // ~30 sim-sec/real-sec  → 1 lap ≈ 5.5s real
  5:  3.0,   // ~60 sim-sec/real-sec  → 1 lap ≈ 2.8s real
  10: 6.0,   // ~120 sim-sec/real-sec → 1 lap ≈ 1.4s real
  20: 15.0,  // ~300 sim-sec/real-sec → full race ≈ 16s real
};
const TICK_MS = 50; // 20 fps

// ─── Precomputed cumulative lap times per driver ───────────────────────────────
// cumTimes[dn][i] = total seconds after completing lap i (index 0 = 0s, before lap 1)
const CUM_TIMES_MAP: Map<number, number[]> = (() => {
  const m = new Map<number, number[]>();
  for (const d of mockF1State.drivers) {
    const dn = d.driver_number;
    const driverLaps = mockLaps
      .filter((l) => l.driver_number === dn)
      .sort((a, b) => a.lap_number - b.lap_number);
    let cum = 0;
    const arr = [0];
    for (const l of driverLaps) { cum += l.lap_duration ?? 0; arr.push(cum); }
    m.set(dn, arr);
  }
  return m;
})();

// Total race time = leader's (Russell #63) cumulative time after all laps
const LEADER_DN = 63;
const TOTAL_SIM_SECONDS = CUM_TIMES_MAP.get(LEADER_DN)?.at(-1) ?? 4900;

// ─── Driver position on track at a given simTime ─────────────────────────────
// Returns { lapsCompleted, fraction (0-1 within current lap), totalFraction }
function driverProgress(dn: number, simTime: number) {
  const cumTimes = CUM_TIMES_MAP.get(dn);
  if (!cumTimes || cumTimes.length < 2) return { lapsCompleted: 0, fraction: 0, totalFraction: 0 };

  let lapsCompleted = 0;
  for (let i = 1; i < cumTimes.length; i++) {
    if (cumTimes[i] <= simTime) lapsCompleted = i;
    else break;
  }

  const maxLaps = cumTimes.length - 1;
  if (lapsCompleted >= maxLaps) return { lapsCompleted: maxLaps, fraction: 1, totalFraction: maxLaps };

  const lapStart = cumTimes[lapsCompleted];
  const lapEnd   = cumTimes[lapsCompleted + 1];
  const fraction = lapEnd > lapStart ? Math.min(1, (simTime - lapStart) / (lapEnd - lapStart)) : 0;
  return { lapsCompleted, fraction, totalFraction: lapsCompleted + fraction };
}

// ─── Compute track positions (0-1 fraction along SVG path) ───────────────────
export function computeTrackPositions(simTime: number): Map<number, number> {
  const map = new Map<number, number>();
  const leader = driverProgress(LEADER_DN, simTime);

  for (const d of mockF1State.drivers) {
    const dn = d.driver_number;
    const cfg = DRIVER_CONFIGS[dn];
    if (!cfg || cfg.base === 0) { map.set(dn, -1); continue; } // DNS

    // Hide retired drivers once sim time has passed their final cumulative time
    if (cfg.retireLap != null) {
      const cumTimes = CUM_TIMES_MAP.get(dn);
      if (cumTimes && simTime > (cumTimes.at(-1) ?? 0) + 5) {
        map.set(dn, -1);
        continue;
      }
    }

    const dp = driverProgress(dn, simTime);
    const lapsBehind = leader.totalFraction - dp.totalFraction;

    if (lapsBehind > 3) { map.set(dn, -1); continue; } // 3+ laps down — don't show

    // Fraction around the track: leader is at leader.fraction, driver is lapsBehind behind
    const trackFrac = ((leader.fraction - (lapsBehind % 1)) + 2) % 1;
    map.set(dn, trackFrac);
  }
  return map;
}

// ─── Derive F1State at a given simTime ───────────────────────────────────────
function buildStints(lapsUpTo: typeof mockLaps, pitsUpTo: typeof mockPits): DriverStints {
  const stints: DriverStints = {};
  const compounds = ['SOFT', 'MEDIUM', 'HARD'];
  const driverNums = [...new Set(lapsUpTo.map((l) => l.driver_number))];

  for (const dn of driverNums) {
    const dPits = pitsUpTo.filter((p) => p.driver_number === dn).sort((a, b) => a.lap_number - b.lap_number);
    const dLaps = lapsUpTo.filter((l) => l.driver_number === dn);
    if (!dLaps.length) continue;
    const maxLap = Math.max(...dLaps.map((l) => l.lap_number));

    const list: StintInfo[] = [];
    let start = 1, ci = 0;
    for (const pit of dPits) {
      list.push({ compound: compounds[ci % 3], startLap: start, endLap: pit.lap_number, tyreAge: pit.lap_number - start });
      start = pit.lap_number + 1; ci++;
    }
    list.push({ compound: compounds[ci % 3], startLap: start, endLap: maxLap, tyreAge: maxLap - start });
    stints[dn] = list;
  }
  return stints;
}

function deriveState(simTime: number): F1State {
  if (simTime <= 0) {
    return { ...mockF1State, positions: [], intervals: [], laps: [], pits: [], raceControl: [], stints: {}, ersStates: {}, currentLap: 0, lastUpdated: new Date() };
  }

  // Current completed laps per driver (integer)
  const completedLaps = new Map<number, number>();
  const cumAtTime = new Map<number, number>();

  for (const d of mockF1State.drivers) {
    const dp = driverProgress(d.driver_number, simTime);
    completedLaps.set(d.driver_number, dp.lapsCompleted);
    // Cumulative race time elapsed = time to complete their laps so far
    const cumTimes = CUM_TIMES_MAP.get(d.driver_number) ?? [0];
    cumAtTime.set(d.driver_number, Math.min(simTime, cumTimes.at(-1) ?? simTime));
  }

  // Sort by total progress descending (most laps + fraction = leader)
  const ranked = mockF1State.drivers
    .filter((d) => (CUM_TIMES_MAP.get(d.driver_number)?.length ?? 0) > 1) // has laps
    .sort((a, b) => {
      const pa = driverProgress(a.driver_number, simTime).totalFraction;
      const pb = driverProgress(b.driver_number, simTime).totalFraction;
      return pb - pa; // higher totalFraction = further ahead
    });

  const leaderCumTime = cumAtTime.get(ranked[0]?.driver_number ?? LEADER_DN) ?? simTime;

  const positions: Position[] = ranked.map((d, i) => ({
    driver_number: d.driver_number, date: '', position: i + 1, session_key: 9500, meeting_key: 1201,
  }));

  const intervals: Interval[] = ranked.map((d, i) => {
    const myTime = cumAtTime.get(d.driver_number) ?? 0;
    const prevTime = i > 0 ? (cumAtTime.get(ranked[i - 1].driver_number) ?? 0) : myTime;
    return {
      driver_number: d.driver_number,
      date: '',
      gap_to_leader: i === 0 ? 0 : parseFloat((myTime - leaderCumTime).toFixed(3)),
      interval: i === 0 ? 0 : parseFloat((myTime - prevTime).toFixed(3)),
      session_key: 9500,
      meeting_key: 1201,
    };
  });

  const leaderLap = driverProgress(LEADER_DN, simTime).lapsCompleted;
  const lapsUpTo = mockLaps.filter((l) => l.lap_number <= leaderLap);
  const pitsUpTo = mockPits.filter((p) => p.lap_number < leaderLap);
  const rcUpTo   = mockRaceControl.filter((rc) => (rc.lap_number ?? 0) <= leaderLap + 1);

  // ERS: vary charge based on progress + per-driver sin variation
  const scaledErs = Object.fromEntries(
    Object.entries(mockErsStates).map(([k, v]) => {
      const progress = simTime / TOTAL_SIM_SECONDS;
      const charge = Math.max(10, Math.min(100, v.charge - progress * 18 + Math.sin(Number(k) * 0.4 + simTime * 0.01) * 5));
      return [k, { ...v, charge: parseFloat(charge.toFixed(1)), estimatedMJ: parseFloat(((charge / 100) * 4).toFixed(2)) }];
    })
  );

  return {
    ...mockF1State,
    positions,
    intervals,
    laps: lapsUpTo,
    pits: pitsUpTo,
    raceControl: rcUpTo,
    stints: buildStints(lapsUpTo, pitsUpTo),
    ersStates: scaledErs,
    currentLap: leaderLap,
    lastUpdated: new Date(),
    isStale: false,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export interface SimControls {
  simTime: number;
  totalSimSeconds: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  play: () => void;
  pause: () => void;
  reset: () => void;
  seekTo: (t: number) => void;
  setSpeed: (s: PlaybackSpeed) => void;
}

export function useRaceSimulator(): {
  state: F1State;
  controls: SimControls;
  driverTrackPositions: Map<number, number>;
} {
  const [simTime, setSimTime]   = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed]       = useState<PlaybackSpeed>(5);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  const tick = useCallback(() => {
    setSimTime((prev) => {
      if (prev >= TOTAL_SIM_SECONDS) { setIsPlaying(false); return TOTAL_SIM_SECONDS; }
      return prev + SIM_SEC_PER_TICK[speed];
    });
  }, [speed]);

  useEffect(() => {
    clearInterval(tickRef.current);
    if (isPlaying) tickRef.current = setInterval(tick, TICK_MS);
    return () => clearInterval(tickRef.current);
  }, [isPlaying, tick]);

  const state                 = useMemo(() => deriveState(simTime), [simTime]);
  const driverTrackPositions  = useMemo(() => computeTrackPositions(simTime), [simTime]);

  const controls: SimControls = {
    simTime,
    totalSimSeconds: TOTAL_SIM_SECONDS,
    isPlaying,
    speed,
    play:    () => { if (simTime >= TOTAL_SIM_SECONDS) setSimTime(0); setIsPlaying(true); },
    pause:   () => setIsPlaying(false),
    reset:   () => { setIsPlaying(false); setSimTime(0); },
    seekTo:  (t) => setSimTime(Math.max(0, Math.min(TOTAL_SIM_SECONDS, t))),
    setSpeed,
  };

  return { state, controls, driverTrackPositions };
}

export { TOTAL_SIM_SECONDS, TOTAL_LAPS };
