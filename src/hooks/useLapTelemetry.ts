import { useState, useEffect } from 'react';
import type { F1State, CarData, Lap } from '../types/f1';
import { generateLapTelemetry, LAP_LENGTH_M, type TelemetrySample } from '../utils/syntheticTelemetry';

const BASE = '/openf1/v1';
const SIM_SESSION_KEY = 9500;

export interface LapTelemetry {
  samples: TelemetrySample[];
  loading: boolean;
  error: string | null;
  synthetic: boolean;
}

const EMPTY: LapTelemetry = { samples: [], loading: false, error: null, synthetic: false };

/**
 * Fetch (or synthesize) full-resolution telemetry for one driver on one lap.
 *
 * Live / historical OpenF1 sessions: queries /car_data bounded by the lap's
 * date_start → date_start + lap_duration window (car_data is ~3.7Hz, so one
 * lap is a few hundred rows — cheap and on-demand only).
 *
 * Simulator mode (session_key 9500): generates a deterministic synthetic trace
 * from the Albert Park speed profile so the tab works offline.
 */
export function useLapTelemetry(
  state: F1State,
  driverNumber: number | null,
  lapNumber: number | null,
): LapTelemetry {
  const [result, setResult] = useState<LapTelemetry>(EMPTY);

  const sessionKey = state.session?.session_key ?? null;
  const isSim = sessionKey === SIM_SESSION_KEY;

  // Find the lap record (for its time window / duration)
  const lap: Lap | undefined =
    driverNumber != null && lapNumber != null
      ? state.laps.find((l) => l.driver_number === driverNumber && l.lap_number === lapNumber)
      : undefined;

  useEffect(() => {
    if (driverNumber == null || lapNumber == null) { setResult(EMPTY); return; }

    // ── Simulator: synthetic trace ────────────────────────────────────────
    if (isSim) {
      // Pace offset from finishing order-ish: use position if available
      const pos = state.positions.find((p) => p.driver_number === driverNumber)?.position ?? 10;
      setResult({
        samples: generateLapTelemetry(driverNumber, lapNumber, (pos - 1) * 0.9),
        loading: false,
        error: null,
        synthetic: true,
      });
      return;
    }

    // ── Live / historical: fetch real car_data for the lap window ─────────
    if (!sessionKey || !lap?.date_start) {
      setResult({ ...EMPTY, error: 'No timing data for this lap yet.' });
      return;
    }

    let cancelled = false;
    setResult({ ...EMPTY, loading: true });

    const start = new Date(lap.date_start);
    const durationS = lap.lap_duration ?? 120;
    const end = new Date(start.getTime() + durationS * 1000);
    const url =
      `${BASE}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}` +
      `&date>=${start.toISOString()}&date<=${end.toISOString()}`;

    fetch(url)
      .then((res) => { if (!res.ok) throw new Error(`OpenF1 → ${res.status}`); return res.json(); })
      .then((rows: CarData[]) => {
        if (cancelled) return;
        if (!rows.length) { setResult({ ...EMPTY, error: 'No telemetry returned for this lap.' }); return; }

        const sorted = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const t0 = new Date(sorted[0].date).getTime();
        const tSpan = Math.max(1, new Date(sorted.at(-1)!.date).getTime() - t0);

        const samples: TelemetrySample[] = sorted.map((r) => ({
          // Approximate distance by time fraction — good enough for trace shape
          dist: Math.round(((new Date(r.date).getTime() - t0) / tSpan) * LAP_LENGTH_M),
          speed: r.speed,
          throttle: r.throttle,
          brake: typeof r.brake === 'number' ? (r.brake > 1 ? r.brake : r.brake * 100) : 0,
          gear: r.n_gear,
          drs: r.drs >= 10, // OpenF1 DRS codes: 10/12/14 = open
        }));
        setResult({ samples, loading: false, error: null, synthetic: false });
      })
      .catch((e) => {
        if (!cancelled) setResult({ ...EMPTY, error: e instanceof Error ? e.message : 'Fetch failed' });
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverNumber, lapNumber, sessionKey, isSim, lap?.date_start, lap?.lap_duration]);

  return result;
}
