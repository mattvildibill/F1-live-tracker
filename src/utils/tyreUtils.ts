export type Compound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | string;

export const TYRE_COLORS: Record<string, string> = {
  SOFT: '#FF3B30',
  MEDIUM: '#FDE74C',
  HARD: '#E0DCDC',
  INTERMEDIATE: '#39B54A',
  WET: '#0067FF',
};

export const TYRE_LABELS: Record<string, string> = {
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
  INTERMEDIATE: 'I',
  WET: 'W',
};

export function getTyreColor(compound: string): string {
  return TYRE_COLORS[compound?.toUpperCase()] ?? '#6b7280';
}

export function getTyreLabel(compound: string): string {
  return TYRE_LABELS[compound?.toUpperCase()] ?? compound?.[0] ?? '?';
}

export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const s = Math.floor(secs);
  const ms = Math.round((secs - s) * 1000);
  return `${mins}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function formatGap(gap: number | null | undefined): string {
  if (gap == null) return '--';
  if (gap === 0) return 'Leader';
  return `+${gap.toFixed(3)}`;
}

export const SECTOR_COLORS = {
  FASTEST_OVERALL: '#a855f7',   // purple
  PERSONAL_BEST: '#22c55e',     // green
  SLOWER: '#eab308',            // yellow
};
