import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { F1State } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';
import { formatLapTime } from '../utils/tyreUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  state: F1State;
}

export default function HeadToHead({ state }: Props) {
  const { drivers, laps, positions, intervals, stints } = state;
  const sorted = [...positions].sort((a, b) => a.position - b.position);
  const [driverA, setDriverA] = useState<number | null>(null);
  const [driverB, setDriverB] = useState<number | null>(null);

  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
  const dA = driverA ? driverMap.get(driverA) : null;
  const dB = driverB ? driverMap.get(driverB) : null;

  const lapsA = useMemo(() => {
    if (!driverA) return [];
    return laps.filter((l) => l.driver_number === driverA && l.lap_duration != null)
      .sort((a, b) => a.lap_number - b.lap_number).slice(-5);
  }, [laps, driverA]);

  const lapsB = useMemo(() => {
    if (!driverB) return [];
    return laps.filter((l) => l.driver_number === driverB && l.lap_duration != null)
      .sort((a, b) => a.lap_number - b.lap_number).slice(-5);
  }, [laps, driverB]);

  const lapNumbers = useMemo(() => {
    const all = new Set([...lapsA.map((l) => l.lap_number), ...lapsB.map((l) => l.lap_number)]);
    return Array.from(all).sort((a, b) => a - b);
  }, [lapsA, lapsB]);

  const colorA = dA ? getTeamColor(dA.team_name, dA.team_colour) : '#60a5fa';
  const colorB = dB ? getTeamColor(dB.team_name, dB.team_colour) : '#f87171';

  const chartData = {
    labels: lapNumbers.map((l) => `Lap ${l}`),
    datasets: [
      ...(dA && lapsA.length ? [{
        label: dA.name_acronym,
        data: lapNumbers.map((ln) => lapsA.find((l) => l.lap_number === ln)?.lap_duration ?? null),
        borderColor: colorA,
        backgroundColor: colorA + '33',
        tension: 0.3,
        pointRadius: 4,
      }] : []),
      ...(dB && lapsB.length ? [{
        label: dB.name_acronym,
        data: lapNumbers.map((ln) => lapsB.find((l) => l.lap_number === ln)?.lap_duration ?? null),
        borderColor: colorB,
        backgroundColor: colorB + '33',
        tension: 0.3,
        pointRadius: 4,
      }] : []),
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#9ca3af' } },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${ctx.dataset.label}: ${formatLapTime(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
      y: {
        ticks: { color: '#6b7280', callback: (v: number | string) => formatLapTime(Number(v)) },
        grid: { color: '#1f2937' },
        reverse: false,
      },
    },
  };

  function getStatRow(label: string, valA: string, valB: string) {
    return (
      <tr key={label} className="border-b border-gray-800">
        <td className="py-2 px-3 text-right font-mono text-sm" style={{ color: colorA }}>{valA}</td>
        <td className="py-2 px-3 text-center text-xs text-gray-500 uppercase tracking-wide">{label}</td>
        <td className="py-2 px-3 text-left font-mono text-sm" style={{ color: colorB }}>{valB}</td>
      </tr>
    );
  }

  const posA = positions.find((p) => p.driver_number === driverA);
  const posB = positions.find((p) => p.driver_number === driverB);
  const intA = intervals.find((i) => i.driver_number === driverA);
  const intB = intervals.find((i) => i.driver_number === driverB);
  const stintsA = stints[driverA ?? 0] ?? [];
  const stintsB = stints[driverB ?? 0] ?? [];
  const lastLapA = lapsA[lapsA.length - 1];
  const lastLapB = lapsB[lapsB.length - 1];

  return (
    <div className="p-4 space-y-6">
      {/* Driver selects */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm flex-1"
          value={driverA ?? ''}
          onChange={(e) => setDriverA(Number(e.target.value) || null)}
        >
          <option value="">Select Driver A</option>
          {sorted.map((p) => {
            const d = driverMap.get(p.driver_number);
            if (!d) return null;
            return <option key={d.driver_number} value={d.driver_number}>{p.position}. {d.name_acronym} — {d.team_name}</option>;
          })}
        </select>

        <span className="text-gray-500 font-bold">vs</span>

        <select
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm flex-1"
          value={driverB ?? ''}
          onChange={(e) => setDriverB(Number(e.target.value) || null)}
        >
          <option value="">Select Driver B</option>
          {sorted.map((p) => {
            const d = driverMap.get(p.driver_number);
            if (!d) return null;
            return <option key={d.driver_number} value={d.driver_number}>{p.position}. {d.name_acronym} — {d.team_name}</option>;
          })}
        </select>
      </div>

      {/* Comparison table */}
      {(dA || dB) && (
        <div className="bg-gray-800/40 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-2 px-3 text-right" style={{ color: colorA }}>{dA?.name_acronym ?? '—'}</th>
                <th className="py-2 px-3 text-center text-xs text-gray-500 uppercase">Stat</th>
                <th className="py-2 px-3 text-left" style={{ color: colorB }}>{dB?.name_acronym ?? '—'}</th>
              </tr>
            </thead>
            <tbody>
              {getStatRow('Position', posA ? `P${posA.position}` : '—', posB ? `P${posB.position}` : '—')}
              {getStatRow('Gap to Leader', intA?.gap_to_leader != null ? `+${Number(intA.gap_to_leader).toFixed(3)}` : '—', intB?.gap_to_leader != null ? `+${Number(intB.gap_to_leader).toFixed(3)}` : '—')}
              {getStatRow('Last Lap', formatLapTime(lastLapA?.lap_duration), formatLapTime(lastLapB?.lap_duration))}
              {getStatRow('Pit Stops', String(stintsA.length > 0 ? stintsA.length - 1 : 0), String(stintsB.length > 0 ? stintsB.length - 1 : 0))}
              {getStatRow('Current Tyre', stintsA[stintsA.length - 1]?.compound ?? '—', stintsB[stintsB.length - 1]?.compound ?? '—')}
              {getStatRow('Tyre Age', stintsA[stintsA.length - 1] ? `${stintsA[stintsA.length - 1].tyreAge}L` : '—', stintsB[stintsB.length - 1] ? `${stintsB[stintsB.length - 1].tyreAge}L` : '—')}
            </tbody>
          </table>
        </div>
      )}

      {/* Lap time chart */}
      {(lapsA.length > 0 || lapsB.length > 0) && (
        <div className="bg-gray-800/40 rounded-xl p-4">
          <h3 className="text-sm text-gray-400 mb-3">Last 5 Laps Comparison</h3>
          <Line data={chartData} options={chartOptions as object} />
        </div>
      )}

      {!dA && !dB && (
        <div className="text-center text-gray-500 py-12">Select two drivers to compare</div>
      )}
    </div>
  );
}
