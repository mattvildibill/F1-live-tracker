import { useMemo } from 'react';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  state: F1State;
}

export default function GapChart({ state }: Props) {
  const { drivers, laps, positions } = state;
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

  // Top 6 by current position
  const top6 = [...positions]
    .sort((a, b) => a.position - b.position)
    .slice(0, 6)
    .map((p) => p.driver_number);

  // Build gap-to-leader per lap for top 6
  // We approximate gap from lap times — leader sets the reference, others diff
  const { labels, datasets } = useMemo(() => {
    if (!laps.length || !top6.length) return { labels: [], datasets: [] };

    const allLapNums = [...new Set(laps.map((l) => l.lap_number))].sort((a, b) => a - b);
    const last15 = allLapNums.slice(-15);

    // Leader is P1
    const leaderNum = top6[0];
    const leaderLaps = new Map(
      laps.filter((l) => l.driver_number === leaderNum).map((l) => [l.lap_number, l.lap_duration])
    );

    const datasets = top6.map((dn) => {
      const driver = driverMap.get(dn);
      if (!driver) return null;
      const color = getTeamColor(driver.team_name, driver.team_colour);
      const driverLaps = new Map(
        laps.filter((l) => l.driver_number === dn).map((l) => [l.lap_number, l.lap_duration])
      );

      // Cumulative time difference from leader
      let cumulativeGap = 0;
      const data = last15.map((ln) => {
        const myTime = driverLaps.get(ln);
        const leaderTime = leaderLaps.get(ln);
        if (myTime != null && leaderTime != null && dn !== leaderNum) {
          cumulativeGap += myTime - leaderTime;
          return parseFloat(cumulativeGap.toFixed(3));
        }
        if (dn === leaderNum) return 0;
        return null;
      });

      return {
        label: driver.name_acronym,
        data,
        borderColor: color,
        backgroundColor: color + '22',
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2,
      };
    }).filter(Boolean);

    return { labels: last15.map((l) => `L${l}`), datasets };
  }, [laps, top6, driverMap]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#9ca3af', boxWidth: 12 } },
      title: {
        display: true,
        text: 'Gap to Leader — Last 15 Laps (Top 6)',
        color: '#6b7280',
        font: { size: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${ctx.dataset.label}: +${ctx.parsed.y.toFixed(3)}s`,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
      y: {
        ticks: { color: '#6b7280', callback: (v: number | string) => `+${Number(v).toFixed(1)}s` },
        grid: { color: '#1f2937' },
      },
    },
  };

  if (!labels.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Waiting for lap data to build gap chart…
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-gray-800/40 rounded-xl p-4">
        <Line data={{ labels, datasets: datasets as never[] }} options={chartOptions as object} />
      </div>
    </div>
  );
}
