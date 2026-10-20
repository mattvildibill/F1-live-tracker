// Live samples are aligned by elapsed lap percentage, not measured distance.
// This works for every circuit without borrowing the demo's Albert Park length.
export function elapsedLapPercent(timestamp: string, lapStart: string, durationSeconds: number) {
  const elapsed = Date.parse(timestamp) - Date.parse(lapStart);
  if (!Number.isFinite(elapsed) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return Math.max(0, Math.min(100, elapsed / (durationSeconds * 10)));
}
