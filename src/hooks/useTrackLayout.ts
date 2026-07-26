/**
 * useTrackLayout — real GPS-derived Albert Park circuit layout.
 *
 * The ALBERT_PARK_PATH is derived from real OpenF1 location telemetry:
 *   Session 9488 · 2024 Australian GP · Driver #16 (Leclerc) · Lap 12
 *   315 GPS points, bounding box: x∈[-7210,7502], y∈[-5562,11852]
 *   Scale: 0.027564 (Y-constrained), ViewBox: 490×560, Padding: 40
 *
 * In live mode the hook fetches GPS data for the current session's leader,
 * derives a new scaled path, and returns a toSvg() coordinate transform so
 * car dots can be placed directly from real GPS coordinates.
 */

import { useState, useEffect } from 'react';
import { OPENF1_BASE } from '../utils/api';

export const VIEW_W = 490;   // matches Albert Park GPS path width
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

// ─── Real GPS-derived Albert Park circuit path ────────────────────────────────
// Source: OpenF1 session 9488 (2024 Australian GP), driver #16, lap 12.
// 315 GPS points normalised to a 490×560 SVG viewport with 40 px padding.
// Start/finish is at approximately SVG (199.8, 397.7).
export const ALBERT_PARK_PATH =
  'M 199.8 397.7 L 194.9 393.0 L 190.6 389.0 L 188.0 386.5 L 185.4 384.0 ' +
  'L 180.4 379.3 L 177.5 376.5 L 174.5 373.7 L 170.2 369.6 L 166.2 365.8 ' +
  'L 163.4 363.1 L 159.2 359.2 L 155.1 355.2 L 150.6 351.1 L 146.8 347.4 ' +
  'L 144.4 344.9 L 141.2 340.9 L 138.8 336.9 L 137.8 334.0 L 137.5 330.8 ' +
  'L 137.7 329.0 L 138.2 325.7 L 138.7 323.4 L 139.3 321.2 L 140.5 316.3 ' +
  'L 140.9 312.4 L 140.8 309.7 L 140.2 304.6 L 139.7 302.1 L 138.9 299.6 ' +
  'L 138.0 297.1 L 136.0 293.5 L 134.1 290.6 L 129.9 285.7 L 127.5 283.3 ' +
  'L 123.9 280.0 L 121.4 277.9 L 116.5 273.6 L 113.7 271.0 L 110.2 267.8 ' +
  'L 105.9 263.7 L 99.2 257.1 L 95.5 253.2 L 92.9 250.5 L 91.8 249.3 ' +
  'L 87.8 244.9 L 85.2 242.0 L 79.9 235.9 L 75.6 230.6 L 74.2 228.9 ' +
  'L 71.3 225.2 L 65.4 217.3 L 63.1 214.1 L 60.8 211.0 L 57.6 206.4 ' +
  'L 55.0 202.4 L 52.8 199.2 L 49.1 193.5 L 47.0 190.4 L 45.1 187.4 ' +
  'L 43.1 184.1 L 42.6 183.2 L 41.0 179.7 L 40.5 178.2 L 40.2 176.6 ' +
  'L 40.1 172.9 L 40.3 171.5 L 41.0 169.5 L 42.3 167.7 L 43.1 166.9 ' +
  'L 44.3 166.2 L 47.2 165.2 L 49.2 164.8 L 50.4 164.7 L 54.0 164.2 ' +
  'L 57.5 163.8 L 59.6 163.6 L 60.3 163.5 L 65.0 162.7 L 69.8 161.0 ' +
  'L 71.7 159.8 L 75.1 156.7 L 76.2 155.2 L 77.4 152.6 L 78.3 149.5 ' +
  'L 78.5 147.3 L 78.5 143.4 L 78.1 138.9 L 77.4 133.9 L 76.7 129.9 ' +
  'L 75.7 123.4 L 75.1 118.9 L 74.8 114.5 L 75.0 109.5 L 75.3 106.7 ' +
  'L 76.0 103.1 L 78.3 96.9 L 79.7 94.4 L 85.0 88.3 L 89.7 84.4 ' +
  'L 92.2 82.4 L 95.6 79.9 L 100.8 76.2 L 110.1 70.5 L 112.6 69.1 ' +
  'L 117.4 66.8 L 120.8 65.2 L 129.2 61.6 L 133.0 59.9 L 136.4 58.4 ' +
  'L 138.7 57.3 L 144.7 54.7 L 149.3 52.6 L 155.3 49.7 L 160.0 47.1 ' +
  'L 162.9 45.4 L 167.1 42.7 L 170.0 41.1 L 174.2 40.1 L 179.1 40.5 ' +
  'L 182.9 42.0 L 186.1 44.2 L 190.1 47.2 L 193.3 49.2 L 199.7 51.7 ' +
  'L 203.9 52.8 L 207.8 53.6 L 213.9 54.8 L 219.5 55.9 L 224.7 57.2 ' +
  'L 227.7 58.1 L 231.7 59.6 L 235.3 61.1 L 240.2 63.8 L 243.5 66.1 ' +
  'L 246.9 69.0 L 251.2 73.5 L 253.8 76.7 L 257.1 81.6 L 258.8 84.4 ' +
  'L 261.4 89.7 L 263.1 93.6 L 265.8 102.2 L 267.3 108.1 L 268.1 111.9 ' +
  'L 269.7 119.6 L 270.4 124.9 L 270.9 131.5 L 270.9 136.4 L 270.5 143.5 ' +
  'L 270.2 148.0 L 269.6 154.7 L 269.0 159.2 L 268.2 163.2 L 266.9 167.5 ' +
  'L 265.3 171.8 L 263.8 176.1 L 262.1 180.9 L 261.1 183.9 L 258.8 190.9 ' +
  'L 256.9 196.6 L 253.0 206.0 L 250.8 210.6 L 248.2 217.9 L 247.3 221.6 ' +
  'L 246.3 228.0 L 245.9 232.7 L 246.3 244.5 L 247.3 253.8 L 248.5 261.6 ' +
  'L 248.7 262.5 L 251.7 272.8 L 255.6 282.3 L 259.0 289.4 L 261.2 293.5 ' +
  'L 265.0 299.8 L 267.1 302.8 L 270.5 307.2 L 274.1 311.3 L 279.6 316.9 ' +
  'L 283.0 320.1 L 288.7 325.3 L 296.5 332.0 L 299.3 334.2 L 303.5 337.4 ' +
  'L 307.6 340.3 L 312.2 343.0 L 316.2 344.4 L 319.7 344.8 L 326.0 344.3 ' +
  'L 327.7 344.1 L 331.8 343.5 L 335.9 343.0 L 343.1 342.7 L 347.6 343.0 ' +
  'L 350.5 343.6 L 353.4 344.7 L 358.8 348.1 L 363.0 351.6 L 367.2 355.2 ' +
  'L 370.9 358.3 L 373.2 360.2 L 376.1 362.6 L 379.7 365.6 L 383.0 368.4 ' +
  'L 390.3 374.6 L 392.4 376.4 L 395.9 379.4 L 399.6 382.8 L 402.5 385.8 ' +
  'L 407.0 390.8 L 409.6 394.2 L 412.2 398.0 L 414.7 402.1 L 416.3 405.1 ' +
  'L 418.1 408.5 L 420.7 414.0 L 422.1 417.7 L 424.7 424.7 L 426.3 429.2 ' +
  'L 427.9 433.8 L 430.3 440.9 L 432.2 446.7 L 433.9 451.8 L 435.7 457.7 ' +
  'L 436.3 459.3 L 439.5 469.3 L 442.0 477.4 L 442.7 480.4 L 444.0 486.9 ' +
  'L 445.3 493.8 L 445.5 498.0 L 445.4 499.3 L 445.0 500.9 L 444.1 502.9 ' +
  'L 443.0 504.0 L 439.8 505.7 L 435.8 507.0 L 433.7 507.6 L 430.0 508.7 ' +
  'L 425.5 509.9 L 423.0 510.6 L 419.7 511.4 L 415.5 512.3 L 412.9 512.9 ' +
  'L 409.2 513.9 L 406.2 514.7 L 402.7 515.6 L 399.9 516.3 L 394.1 517.9 ' +
  'L 388.0 519.4 L 380.8 520.0 L 375.9 519.0 L 374.5 518.3 L 369.7 515.2 ' +
  'L 367.6 513.2 L 364.4 509.5 L 361.6 505.3 L 358.6 500.0 L 357.0 496.9 ' +
  'L 355.3 493.4 L 355.0 492.8 L 353.3 489.4 L 351.3 484.9 L 349.5 481.1 ' +
  'L 348.2 478.4 L 345.6 474.3 L 344.6 472.7 L 342.9 470.3 L 342.1 469.4 ' +
  'L 340.7 468.2 L 339.3 467.3 L 336.2 466.7 L 335.0 466.9 L 333.3 467.4 ' +
  'L 331.3 468.6 L 329.7 470.0 L 328.4 471.4 L 327.1 473.3 L 325.3 476.1 ' +
  'L 324.0 478.4 L 323.6 479.1 L 321.5 481.9 L 319.5 483.9 L 317.3 485.6 ' +
  'L 315.8 486.6 L 314.3 487.4 L 311.0 488.8 L 306.7 489.6 L 303.1 489.5 ' +
  'L 300.2 489.0 L 296.5 487.8 L 291.2 485.2 L 288.4 483.1 L 284.3 479.5 ' +
  'L 281.0 476.4 L 277.1 472.6 L 273.6 469.2 L 268.4 464.2 L 265.0 460.7 ' +
  'L 261.4 457.3 L 257.8 453.8 L 253.0 449.1 L 249.6 445.7 L 246.5 442.6 ' +
  'L 243.0 439.2 L 240.9 437.2 L 235.8 432.2 L 232.8 429.2 L 228.6 425.1 ' +
  'L 225.1 421.8 L 220.4 417.3 L 214.7 411.9 L 207.7 405.3 L 204.8 402.5 Z';

// GPS bounding box used to generate the above path — used for live toSvg() fallback
const AP_MIN_X = -7210, AP_MIN_Y = -5562, AP_SCALE = 0.027564;

// Pit lane: runs parallel to the final pit-straight section (counterclockwise approach to S/F)
// Approximated as an offset line alongside the ~(235,432)→(199,398) segment.
export const PIT_LANE_PATH = 'M 228 440 L 207 415';

// DRS zones: [startFrac, endFrac] along ALBERT_PARK_PATH.
// Zone 1 = pit straight (S/F → T1 braking)
// Zone 2 = back section (T10 exit → T11 braking)
export const DRS_ZONES: Array<[number, number]> = [
  [0.00, 0.05],
  [0.61, 0.72],
];

// Sector boundaries as path fractions.
// S1: S/F → T10 exit (~0.62); S2: T10 → T12 exit (~0.75); S3: T12 → S/F
export const SECTOR_FRACS = [
  { frac: 0.62, label: '2' },
  { frac: 0.75, label: '3' },
];

// Turn labels at approximate path fractions
export const TURN_LABELS: Array<[number, string]> = [
  [0.05, 'T1'],
  [0.12, 'T3'],
  [0.24, 'T4'],
  [0.38, 'T6'],
  [0.52, 'T8'],
  [0.60, 'T9'],
  [0.70, 'T11'],
  [0.90, 'T14'],
];

// ─── Process raw GPS points into an SVG path (for live sessions) ──────────────
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
  // Scale to fit 800×560 for live sessions
  const liveW = 800, liveH = VIEW_H;
  const scale = Math.min((liveW - PADDING * 2) / rangeX, (liveH - PADDING * 2) / rangeY);
  // Center horizontally
  const xOffset = (liveW - rangeX * scale) / 2;
  const yOffset = PADDING;

  const toSvg = (x: number, y: number) => ({
    cx: (x - minX) * scale + xOffset,
    cy: liveH - ((y - minY) * scale + yOffset),
  });

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
const ALBERT_PARK_TO_SVG = (x: number, y: number) => ({
  cx: (x - AP_MIN_X) * AP_SCALE + PADDING,
  cy: VIEW_H - ((y - AP_MIN_Y) * AP_SCALE + PADDING),
});

const FALLBACK: TrackLayout = {
  svgPath: ALBERT_PARK_PATH,
  viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
  toSvg: ALBERT_PARK_TO_SVG,
  isFromAPI: false,
};

export function useTrackLayout(sessionKey?: number | string): TrackLayout {
  const [layout, setLayout] = useState<TrackLayout>(FALLBACK);

  useEffect(() => {
    if (!sessionKey) return;
    let cancelled = false;

    async function load() {
      try {
        // Try to fetch real GPS layout for the session leader
        const res = await fetch(`${OPENF1_BASE}/location?session_key=${sessionKey}&driver_number=1`);
        if (!res.ok || cancelled) return;
        const raw: { x: number; y: number }[] = await res.json();
        if (raw.length < 100 || cancelled) return;

        const { path, toSvg } = pointsToPath(raw);
        setLayout({ svgPath: path, viewBox: `0 0 800 ${VIEW_H}`, toSvg, isFromAPI: true });
      } catch {
        // keep Albert Park fallback silently
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessionKey]);

  return layout;
}
