export interface TrackPoint {
  readonly x: number;
  readonly y: number;
}

export interface TrackGeometry {
  readonly totalLength: number;
  pointAtLength: (distance: number) => TrackPoint;
}

/**
 * Pure arc-length sampling for the absolute M/L/Z polylines produced by
 * useTrackLayout. Keep rendering independent of SVG DOM refs and mount timing.
 * Unsupported or degenerate paths return null rather than a fabricated circuit.
 */
export function createTrackGeometry(svgPath: string): TrackGeometry | null {
  const tokens = svgPath.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens || tokens.join('') !== svgPath.replace(/[\s,]+/g, '') || tokens[0] !== 'M') return null;

  const points: TrackPoint[] = [];
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    if (command === 'Z') {
      if (i !== tokens.length || !points.length) return null;
      points.push(points[0]);
      break;
    }
    if (command !== (points.length ? 'L' : 'M')) return null;
    const x = Number(tokens[i++]);
    const y = Number(tokens[i++]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    points.push({ x, y });
  }

  const segments: Array<{ start: TrackPoint; end: TrackPoint; from: number; to: number }> = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1];
    const end = points[i];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (!length) continue;
    segments.push({ start, end, from: totalLength, to: totalLength + length });
    totalLength += length;
  }
  if (!totalLength || !Number.isFinite(totalLength)) return null;

  return {
    totalLength,
    pointAtLength(distance) {
      // Like SVGGeometryElement, clamp distances to the path's endpoints.
      const target = Math.min(totalLength, Math.max(0, Number.isNaN(distance) ? 0 : distance));
      let low = 0;
      let high = segments.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (segments[mid].to < target) low = mid + 1;
        else high = mid;
      }
      const { start, end, from, to } = segments[low];
      const fraction = (target - from) / (to - from);
      return {
        x: start.x + (end.x - start.x) * fraction,
        y: start.y + (end.y - start.y) * fraction,
      };
    },
  };
}
