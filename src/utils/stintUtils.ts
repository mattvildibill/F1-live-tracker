import type { Lap, Pit, DriverStints, OpenF1Stint } from '../types/f1';

/** Build DriverStints from real OpenF1 stint data when available, falling back to lap/pit derivation. */
export function deriveStints(laps: Lap[], pits: Pit[], apiStints?: OpenF1Stint[]): DriverStints {
  // Prefer real API stint data — it has accurate compound info
  if (apiStints && apiStints.length > 0) {
    const stints: DriverStints = {};
    const driverNums = [...new Set(apiStints.map((s) => s.driver_number))];
    for (const dn of driverNums) {
      stints[dn] = apiStints
        .filter((s) => s.driver_number === dn)
        .sort((a, b) => a.stint_number - b.stint_number)
        .map((s) => ({
          compound: s.compound,
          startLap: s.lap_start,
          endLap: s.lap_end,
          tyreAge: s.lap_end - s.lap_start + s.tyre_age_at_start,
        }));
    }
    return stints;
  }

  // Fallback: derive from lap history + pit stops (compound assumed via rotation)
  const stints: DriverStints = {};
  const compounds = ['SOFT', 'MEDIUM', 'HARD'];
  const driverNums = [...new Set(laps.map((l) => l.driver_number))];

  for (const dn of driverNums) {
    const driverPits = pits
      .filter((p) => p.driver_number === dn)
      .sort((a, b) => a.lap_number - b.lap_number);
    const driverLaps = laps.filter((l) => l.driver_number === dn);
    if (!driverLaps.length) continue;
    const maxLap = Math.max(...driverLaps.map((l) => l.lap_number));

    const list = [];
    let stintStart = 1;
    let compoundIdx = 0;

    for (const pit of driverPits) {
      list.push({
        compound: compounds[compoundIdx % compounds.length],
        startLap: stintStart,
        endLap: pit.lap_number,
        tyreAge: pit.lap_number - stintStart,
      });
      stintStart = pit.lap_number + 1;
      compoundIdx++;
    }
    list.push({
      compound: compounds[compoundIdx % compounds.length],
      startLap: stintStart,
      endLap: maxLap,
      tyreAge: maxLap - stintStart,
    });

    stints[dn] = list;
  }

  return stints;
}
