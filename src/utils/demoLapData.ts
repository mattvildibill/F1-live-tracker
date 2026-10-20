import type { Lap, Pit, RaceControl, DriverStints } from '../types/f1.ts';

// Lap-based data is unchanged between animation ticks. Reuse its identity so
// tables and charts can keep their memoized calculations while cars move.
export function createDemoLapSelector(laps: Lap[], pits: Pit[], raceControl: RaceControl[], stintsFor: (laps: Lap[], pits: Pit[]) => DriverStints) {
  type Snapshot = { laps: Lap[]; pits: Pit[]; raceControl: RaceControl[]; stints: DriverStints };
  const cache = new Map<number, Snapshot>();
  return (lap: number): Snapshot => {
    const previous = cache.get(lap);
    if (previous) return previous;
    const lapRows = laps.filter(row => row.lap_number <= lap);
    const pitRows = pits.filter(row => row.lap_number < lap);
    const value = { laps: lapRows, pits: pitRows, raceControl: raceControl.filter(row => (row.lap_number ?? 0) <= lap + 1), stints: stintsFor(lapRows, pitRows) };
    cache.set(lap, value);
    return value;
  };
}
