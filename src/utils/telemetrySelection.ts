// Preserve a chosen completed lap as new laps arrive; recover if a seek removes it.
export function availableLap(laps: readonly number[], selected: number | null): number | null {
  return selected != null && laps.includes(selected) ? selected : laps.at(-1) ?? null;
}
