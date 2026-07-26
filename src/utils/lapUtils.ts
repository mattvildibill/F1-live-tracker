import type { Lap } from '../types/f1';

/** Lap times below this are timing artefacts, not real laps. */
const MIN_PLAUSIBLE_LAP_S = 45;

export interface BestLaps {
  /** Fastest valid lap of the session, or null. */
  overall: Lap | null;
  /** Fastest valid lap time per driver. */
  personal: Map<number, number>;
}

export function computeBestLaps(laps: Lap[]): BestLaps {
  const personal = new Map<number, number>();
  let overall: Lap | null = null;

  for (const lap of laps) {
    const t = lap.lap_duration;
    if (t == null || t < MIN_PLAUSIBLE_LAP_S) continue;

    const pb = personal.get(lap.driver_number);
    if (pb == null || t < pb) personal.set(lap.driver_number, t);

    if (overall == null || t < overall.lap_duration!) overall = lap;
  }

  return { overall, personal };
}

/**
 * Broadcast timing convention: purple for the session's fastest lap,
 * green for a driver's own best, yellow/grey for anything slower.
 */
export function lapTimeColor(
  driverNumber: number,
  lapTime: number | null | undefined,
  best: BestLaps
): string {
  if (lapTime == null) return '#6b7280';
  if (best.overall?.lap_duration != null && lapTime <= best.overall.lap_duration) return '#a855f7';
  const pb = best.personal.get(driverNumber);
  if (pb != null && lapTime <= pb) return '#22c55e';
  return '#d1d5db';
}
