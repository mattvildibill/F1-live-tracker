/**
 * useTrackLayout — fetches actual GPS telemetry from OpenF1 to derive the
 * circuit outline. Falls back to a hand-crafted Albert Park path.
 *
 * When a real session is live the hook:
 *  1. Fetches /location data for the leader
 *  2. Computes min/max bounds for uniform scaling
 *  3. Returns toSvg() — a transform that maps any (x,y) GPS coord → SVG point
 *  4. Returns an SVG <polyline> points string tracing the circuit
 *
 * In simulation mode the hook uses the static Albert Park fallback path
 * (a high-fidelity hand-crafted bezier path) that TrackMap reads via pathRef.
 */

import { useState, useEffect } from 'react';

export const VIEW_W = 800;
export const VIEW_H = 560;
const PADDING = 40;

export interface TrackLayout {
  /** SVG <path d="…"> string for the circuit outline */
  svgPath: string;
  viewBox: string;
  /** Converts a raw OpenF1 (x,y) GPS coord → {cx,cy} SVG position */
  toSvg: (x: number, y: number) => { cx: number; cy: number };
  /** true when layout was derived from the live API */
  isFromAPI: boolean;
}

// ─── Fallback: hand-crafted Albert Park 2022+ (14 turns, 5.278 km) ───────────
// Redrawn to accurately represent the real circuit layout:
//   • T2-T3 chicane is immediately after T1 (not mid-bottom-section)
//   • Long Jones Corner straight runs due west before T4
//   • T4 right-hander transitions cars into the lakeside section heading north
//   • T5–T8: fast sweepers along the western lake shore
//   • T9–T10: flowing 2022 replacement for the old slow hairpin
//   • T11–T12 back chicane, then T13–T14 sweep back to pit straight
// Coordinate system: north = low y, east = high x, clockwise circuit.
// ViewBox 0 0 800 560 with PADDING=40. Circuit spans x≈160–625, y≈115–460.
export const ALBERT_PARK_PATH =
  // ── Pit straight — right/east side, heading south (↓) ─────────────────────
  'M 612 130 ' +
  'L 612 342 ' +
  // ── T1: medium-speed right-hander (south → south-west) ─────────────────────
  'C 614 362 628 380 618 408 ' +
  'C 608 430 588 446 564 452 ' +
  // ── T2 (left) – T3 (right): tight chicane immediately after T1 ─────────────
  'C 548 457 530 462 514 455 ' +   // T2 left apex
  'C 498 448 480 458 460 460 ' +   // T3 right apex, exits heading west
  // ── Long Jones Corner straight heading west ─────────────────────────────────
  'L 296 460 ' +
  // ── T4: right-hander (west → north-west, starts lake section) ──────────────
  'C 264 460 232 452 208 430 ' +
  // ── T5: fast left (north-west → north, entering lakeside) ──────────────────
  'C 190 412 176 388 168 360 ' +
  // ── T6 (right sweeper) & T7 (left): fast lakeside section heading north ─────
  'C 160 332 158 302 161 272 ' +
  'C 164 242 172 212 186 188 ' +
  // ── T8: sweeping left at north end of lake (north → north-east) ────────────
  'C 200 164 226 148 260 138 ' +
  'C 292 128 326 120 358 116 ' +
  // ── T9: fast right-hander (2022 mod, north-east → east-south-east) ─────────
  'C 386 112 412 114 432 130 ' +
  'C 450 146 456 170 448 192 ' +
  // ── T10: left (2022 mod, slight correction heading south-east) ──────────────
  'C 440 210 444 230 458 242 ' +
  // ── T11 (right) – T12 (left): back-section chicane ─────────────────────────
  'C 468 252 488 260 506 254 ' +   // T11 right apex
  'C 524 248 536 232 534 210 ' +   // T12 left apex
  // ── T13: fast right-hander heading north-east toward pit straight ───────────
  'C 530 188 538 164 558 150 ' +
  // ── T14: final fast right-hander sweeping back onto pit straight ────────────
  'C 576 138 596 130 610 128 ' +
  'L 612 130 Z';

// Pit lane (parallel to the racing line's pit straight, slightly east)
export const PIT_LANE_PATH = 'M 626 162 L 626 330';

// DRS zones: [startFrac, endFrac] along the main path.
// Zone 1 = full pit straight (T14 exit → T1 braking).
// Zone 2 = back section (T9 exit → T11 braking point).
export const DRS_ZONES: Array<[number, number]> = [
  [0.00, 0.13],
  [0.73, 0.84],
];

// Sector boundaries as fractions along the path (approximate).
// S1: start → T8 exit; S2: T8 → T12 exit; S3: T12 → finish.
export const SECTOR_FRACS = [
  { frac: 0.62, label: '2' },
  { frac: 0.88, label: '3' },
];

// Turn labels positioned along the new path fractions.
export const TURN_LABELS: Array<[number, string]> = [
  [0.16, 'T1'],
  [0.25, 'T3'],
  [0.38, 'T4'],
  [0.48, 'T6'],
  [0.62, 'T8'],
  [0.76, 'T9'],
  [0.85, 'T11'],
  [0.96, 'T14'],
];

// ─── Process raw GPS points into an SVG path ─────────────────────────────────
function pointsToPath(raw: { x: number; y: number }[]): {
  path: string;
  toSvg: (x: number, y: number) => { cx: number; cy: number };
} {
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((VIEW_W - PADDING * 2) / rangeX, (VIEW_H - PADDING * 2) / rangeY);

  const toSvg = (x: number, y: number) => ({
    cx: (x - minX) * scale + PADDING,
    // OpenF1 y-axis points up; SVG y points down → flip
    cy: VIEW_H - ((y - minY) * scale + PADDING),
  });

  // Downsample to at most 800 points then build a smooth path
  const step = Math.max(1, Math.floor(raw.length / 800));
  const pts = raw.filter((_, i) => i % step === 0);
  const d =
    pts
      .map((p, i) => {
        const { cx, cy } = toSvg(p.x, p.y);
        return i === 0 ? `M ${cx.toFixed(1)} ${cy.toFixed(1)}` : `L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      })
      .join(' ') + ' Z';

  return { path: d, toSvg };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
const IDENTITY_TO_SVG = (x: number, y: number) => ({ cx: x, cy: y });

const FALLBACK: TrackLayout = {
  svgPath: ALBERT_PARK_PATH,
  viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
  toSvg: IDENTITY_TO_SVG,
  isFromAPI: false,
};

export function useTrackLayout(sessionKey?: number | string): TrackLayout {
  const [layout, setLayout] = useState<TrackLayout>(FALLBACK);

  useEffect(() => {
    if (!sessionKey) return;
    let cancelled = false;

    async function load() {
      try {
        // Grab location data for the top driver — typically returns thousands of points
        const res = await fetch(`/openf1/v1/location?session_key=${sessionKey}&driver_number=1`);
        if (!res.ok || cancelled) return;
        const raw: { x: number; y: number }[] = await res.json();
        if (!raw.length || cancelled) return;

        const { path, toSvg } = pointsToPath(raw);
        setLayout({ svgPath: path, viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, toSvg, isFromAPI: true });
      } catch {
        // keep fallback silently
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessionKey]);

  return layout;
}
