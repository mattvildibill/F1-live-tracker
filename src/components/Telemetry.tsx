import { useMemo, useState, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { F1State } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';
import { formatLapTime } from '../utils/tyreUtils';
import { useLapTelemetry } from '../hooks/useLapTelemetry';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  state: F1State;
}

const chartBase = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 } as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { labels: { color: '#9ca3af', boxWidth: 12, font: { size: 11 } } },
    tooltip: { backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1 },
  },
  scales: {
    x: {
      ticks: { color: '#6b7280', maxTicksLimit: 12, font: { size: 10 } },
      grid: { color: 'rgba(55,65,81,0.25)' },
      title: { display: true, text: 'Distance (m)', color: '#6b7280', font: { size: 10 } },
    },
    y: {
      ticks: { color: '#6b7280', font: { size: 10 } },
      grid: { color: 'rgba(55,65,81,0.25)' },
    },
  },
};

export default function Telemetry({ state }: Props) {
  const { drivers, laps, positions } = state;

  const activeDrivers = useMemo(() => {
    const withLaps = new Set(laps.map((l) => l.driver_number));
    return drivers
      .filter((d) => withLaps.has(d.driver_number))
      .sort((a, b) => {
        const pa = positions.find((p) => p.driver_number === a.driver_number)?.position ?? 99;
        const pb = positions.find((p) => p.driver_number === b.driver_number)?.position ?? 99;
        return pa - pb;
      });
  }, [drivers, laps, positions]);

  const [driverA, setDriverA] = useState<number | null>(null);
  const [driverB, setDriverB] = useState<number | null>(null); // null = no compare
  const [lapNumber, setLapNumber] = useState<number | null>(null);

  // Default to leader + their latest complete lap
  useEffect(() => {
    if (driverA == null && activeDrivers.length) setDriverA(activeDrivers[0].driver_number);
  }, [activeDrivers, driverA]);

  const lapsForA = useMemo(() =>
    laps
      .filter((l) => l.driver_number === driverA && l.lap_duration != null)
      .map((l) => l.lap_number)
      .sort((a, b) => a - b),
    [laps, driverA]
  );

  useEffect(() => {
    if (lapsForA.length && (lapNumber == null || !lapsForA.includes(lapNumber))) {
      setLapNumber(lapsForA.at(-1)!);
    }
  }, [lapsForA, lapNumber]);

  const telA = useLapTelemetry(state, driverA, lapNumber);
  const telB = useLapTelemetry(state, driverB, lapNumber);

  const dA = drivers.find((d) => d.driver_number === driverA);
  const dB = drivers.find((d) => d.driver_number === driverB);
  const colorA = dA ? getTeamColor(dA.team_name, dA.team_colour) : '#ef4444';
  const colorB = dB ? getTeamColor(dB.team_name, dB.team_colour) : '#3b82f6';
  // Same-team compare: shift B toward white so both traces are readable
  const colorBDraw = dA && dB && dA.team_name === dB.team_name ? '#e5e7eb' : colorB;

  const labels = useMemo(
    () => (telA.samples.length ? telA.samples : telB.samples).map((s) => s.dist),
    [telA.samples, telB.samples]
  );

  const mkDatasets = (field: 'speed' | 'throttle' | 'brake' | 'gear') => {
    const ds = [];
    if (telA.samples.length && dA) {
      ds.push({
        label: `${dA.name_acronym}`,
        data: telA.samples.map((s) => s[field]),
        borderColor: colorA,
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        pointRadius: 0,
        tension: 0.25,
        stepped: field === 'gear' ? true : undefined,
      });
    }
    if (telB.samples.length && dB) {
      ds.push({
        label: `${dB.name_acronym}`,
        data: telB.samples.map((s) => s[field]),
        borderColor: colorBDraw,
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        pointRadius: 0,
        tension: 0.25,
        borderDash: [5, 3],
        stepped: field === 'gear' ? true : undefined,
      });
    }
    return ds;
  };

  const lapA = laps.find((l) => l.driver_number === driverA && l.lap_number === lapNumber);
  const lapB = laps.find((l) => l.driver_number === driverB && l.lap_number === lapNumber);

  const selectCls =
    'bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gray-500';

  const busy = telA.loading || telB.loading;

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Driver
          <select className={selectCls} value={driverA ?? ''} onChange={(e) => setDriverA(Number(e.target.value))}>
            {activeDrivers.map((d) => (
              <option key={d.driver_number} value={d.driver_number}>
                #{d.driver_number} {d.name_acronym} — {d.team_name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Compare with
          <select
            className={selectCls}
            value={driverB ?? ''}
            onChange={(e) => setDriverB(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— none —</option>
            {activeDrivers.filter((d) => d.driver_number !== driverA).map((d) => (
              <option key={d.driver_number} value={d.driver_number}>
                #{d.driver_number} {d.name_acronym}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Lap
          <select className={selectCls} value={lapNumber ?? ''} onChange={(e) => setLapNumber(Number(e.target.value))}>
            {lapsForA.map((ln) => <option key={ln} value={ln}>Lap {ln}</option>)}
          </select>
        </label>

        {/* Lap time chips */}
        <div className="flex gap-2 ml-auto">
          {lapA && dA && (
            <span className="px-2.5 py-1.5 rounded bg-gray-900 border border-gray-800 text-xs font-mono" style={{ color: colorA }}>
              {dA.name_acronym} {formatLapTime(lapA.lap_duration)}
            </span>
          )}
          {lapB && dB && (
            <span className="px-2.5 py-1.5 rounded bg-gray-900 border border-gray-800 text-xs font-mono" style={{ color: colorBDraw }}>
              {dB.name_acronym} {formatLapTime(lapB.lap_duration)}
              {lapA?.lap_duration != null && lapB.lap_duration != null && (
                <span className="text-gray-500 ml-1.5">
                  ({lapB.lap_duration >= lapA.lap_duration ? '+' : ''}{(lapB.lap_duration - lapA.lap_duration).toFixed(3)})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {telA.synthetic && (
        <p className="text-xs text-gray-600 italic">
          Simulator mode — synthetic traces generated from the Albert Park speed profile.
          Switch to Live mode for real OpenF1 car telemetry.
        </p>
      )}
      {telA.error && !telA.samples.length && (
        <p className="text-xs text-orange-400">{telA.error}</p>
      )}

      {busy ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Loading telemetry…</div>
      ) : telA.samples.length > 0 && (
        <>
          <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Speed (km/h)</h3>
            <div className="h-56">
              <Line
                data={{ labels, datasets: mkDatasets('speed') }}
                options={{ ...chartBase, scales: { ...chartBase.scales, y: { ...chartBase.scales.y, suggestedMin: 60, suggestedMax: 340 } } }}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Throttle (%)</h3>
              <div className="h-40">
                <Line
                  data={{ labels, datasets: mkDatasets('throttle') }}
                  options={{ ...chartBase, plugins: { ...chartBase.plugins, legend: { display: false } }, scales: { ...chartBase.scales, y: { ...chartBase.scales.y, min: 0, max: 105 } } }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Brake (%)</h3>
              <div className="h-40">
                <Line
                  data={{ labels, datasets: mkDatasets('brake') }}
                  options={{ ...chartBase, plugins: { ...chartBase.plugins, legend: { display: false } }, scales: { ...chartBase.scales, y: { ...chartBase.scales.y, min: 0, max: 105 } } }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Gear
              <span className="normal-case font-normal text-gray-600 ml-2">
                DRS open where the speed trace jumps on the straights
              </span>
            </h3>
            <div className="h-36">
              <Line
                data={{ labels, datasets: mkDatasets('gear') }}
                options={{ ...chartBase, plugins: { ...chartBase.plugins, legend: { display: false } }, scales: { ...chartBase.scales, y: { ...chartBase.scales.y, min: 1, max: 8, ticks: { ...chartBase.scales.y.ticks, stepSize: 1 } } } }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
