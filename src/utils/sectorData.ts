import type { Lap } from '../types/f1.ts';

export function sectorsOf(lap: Lap, allowSynthetic = false): [number, number, number] | null {
  if (lap.duration_sector_1 != null && lap.duration_sector_2 != null && lap.duration_sector_3 != null) return [lap.duration_sector_1, lap.duration_sector_2, lap.duration_sector_3];
  // Numeric provider session IDs are not a reliable marker for synthetic data.
  if (!allowSynthetic || lap.lap_duration == null) return null;
  const h = Math.sin(lap.driver_number * 12.9898 + lap.lap_number * 78.233) * 43758.5453;
  const jitter = (h - Math.floor(h) - 0.5) * 0.012;
  const s1 = lap.lap_duration * (0.31 + jitter);
  const s2 = lap.lap_duration * 0.37;
  return [s1, s2, lap.lap_duration - s1 - s2];
}
