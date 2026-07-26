/**
 * Synthetic telemetry for Simulator mode.
 *
 * Generates a deterministic (no Math.random) speed / throttle / brake / gear
 * trace over one lap of Albert Park, keyed by driver number and lap number so
 * two drivers or two laps produce comparably different traces.
 *
 * Anchor speeds are based on the real 2022+ Albert Park layout:
 * flat-out down the pit straight into T1/T2, the T3 Jones Corner braking zone,
 * the fast T5–T8 lakeside sweepers, the flowing T9–T10, the T11–T12 chicane,
 * and the T13–T14 final complex back onto the straight.
 */

export interface TelemetrySample {
  dist: number;      // metres from start/finish line
  speed: number;     // km/h
  throttle: number;  // 0–100
  brake: number;     // 0–100
  gear: number;      // 1–8
  drs: boolean;
}

const LAP_LENGTH_M = 5278; // Albert Park

// [fraction of lap distance, apex/target speed km/h]
const SPEED_ANCHORS: [number, number][] = [
  [0.000, 300], // start/finish straight
  [0.035, 318], // end of pit straight (DRS 1)
  [0.055, 145], // T1 braking
  [0.070, 120], // T2 chicane apex
  [0.110, 265], // run to T3
  [0.135, 92],  // T3 Jones Corner — heaviest stop
  [0.160, 150], // T4 exit
  [0.230, 288], // DRS 2 down Lakeside Drive
  [0.265, 205], // T5 entry (fast)
  [0.310, 238], // T6 sweeper
  [0.360, 252], // T7
  [0.400, 216], // T8
  [0.470, 296], // approach T9
  [0.505, 242], // T9 flowing right
  [0.540, 250], // T10
  [0.620, 308], // back straight (DRS 3)
  [0.655, 132], // T11 braking
  [0.672, 118], // T12 chicane
  [0.760, 282], // run to final complex
  [0.800, 148], // T13
  [0.850, 108], // T14 — slowest of the final complex
  [0.920, 232], // exit onto pit straight
  [1.000, 300], // back to S/F
];

// DRS zones as [startFrac, endFrac]
const DRS_ZONES: [number, number][] = [
  [0.94, 0.05],  // pit straight (wraps)
  [0.17, 0.245], // Lakeside Drive
  [0.56, 0.635], // back straight
];

function inDrsZone(frac: number): boolean {
  return DRS_ZONES.some(([a, b]) => (a < b ? frac >= a && frac <= b : frac >= a || frac <= b));
}

/** Deterministic pseudo-noise in [-1, 1] from integer inputs. */
function noise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function interpSpeed(frac: number): number {
  for (let i = 1; i < SPEED_ANCHORS.length; i++) {
    const [f0, s0] = SPEED_ANCHORS[i - 1];
    const [f1, s1] = SPEED_ANCHORS[i];
    if (frac <= f1) {
      const t = (frac - f0) / (f1 - f0 || 1);
      // smoothstep for less angular traces
      const ts = t * t * (3 - 2 * t);
      return s0 + (s1 - s0) * ts;
    }
  }
  return SPEED_ANCHORS.at(-1)![1];
}

function gearForSpeed(speed: number): number {
  if (speed < 105) return 2;
  if (speed < 135) return 3;
  if (speed < 170) return 4;
  if (speed < 205) return 5;
  if (speed < 240) return 6;
  if (speed < 280) return 7;
  return 8;
}

/**
 * Generate one lap of telemetry.
 * @param driverNumber seeds per-driver variation (car pace + tiny line differences)
 * @param lapNumber    seeds per-lap variation (tyre age, fuel load feel)
 * @param paceOffset   0 = front-runner; positive = slower car (km/h shaved off straights)
 */
export function generateLapTelemetry(
  driverNumber: number,
  lapNumber: number,
  paceOffset = 0,
  samples = 240,
): TelemetrySample[] {
  const out: TelemetrySample[] = [];
  const driverSeed = driverNumber * 7.13;
  const lapSeed = lapNumber * 3.71;

  let prevSpeed = interpSpeed(0);

  for (let i = 0; i <= samples; i++) {
    const frac = i / samples;
    const base = interpSpeed(frac);

    // Per-driver + per-lap character: ±2 km/h wobble, straights scaled by pace offset
    const wobble = noise(i + driverSeed + lapSeed) * 2;
    const straightPenalty = base > 250 ? paceOffset : paceOffset * 0.4;
    const drs = inDrsZone(frac) && base > 240;
    const drsBoost = drs ? 8 : 0;

    const speed = Math.max(80, base + wobble - straightPenalty + drsBoost);
    const accel = speed - prevSpeed; // per-sample delta as accel proxy

    let throttle: number;
    let brake: number;
    if (accel < -3) {
      brake = Math.min(100, Math.abs(accel) * 12);
      throttle = 0;
    } else if (accel > 1.5) {
      throttle = Math.min(100, 65 + accel * 10);
      brake = 0;
    } else if (speed > 270) {
      throttle = 100;
      brake = 0;
    } else {
      throttle = 45 + noise(i * 1.7 + driverSeed) * 10; // partial throttle mid-corner
      brake = 0;
    }

    out.push({
      dist: Math.round(frac * LAP_LENGTH_M),
      speed: Math.round(speed),
      throttle: Math.round(Math.max(0, throttle)),
      brake: Math.round(Math.max(0, brake)),
      gear: gearForSpeed(speed),
      drs,
    });
    prevSpeed = speed;
  }
  return out;
}

export { LAP_LENGTH_M };
