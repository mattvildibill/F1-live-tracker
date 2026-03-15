import { useRef, useEffect, useState, useMemo } from 'react';
import type { F1State } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';
import { formatLapTime, formatGap, getTyreColor, getTyreLabel } from '../utils/tyreUtils';
import {
  useTrackLayout,
  ALBERT_PARK_PATH, PIT_LANE_PATH, DRS_ZONES, SECTOR_FRACS, TURN_LABELS,
  VIEW_W, VIEW_H,
} from '../hooks/useTrackLayout';

interface Props {
  state: F1State;
  driverTrackPositions?: Map<number, number>;
}

// Average lap time used when estimating position from gap (live API fallback)
const AVG_LAP_S = 83.0;

export default function TrackMap({ state, driverTrackPositions }: Props) {
  const { drivers, positions, intervals, laps, stints, ersStates, pits } = state;
  const sessionKey = state.session?.session_key;

  // Try to load real GPS-derived layout; falls back to hand-crafted Albert Park
  const layout = useTrackLayout(sessionKey);

  const pathRef  = useRef<SVGPathElement>(null);
  const [totalLength, setTotalLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) setTotalLength(pathRef.current.getTotalLength());
  }, [layout.svgPath]); // recalculate if path changes (API data arrives)

  const driverMap  = new Map(drivers.map((d) => [d.driver_number, d]));
  const intervalMap = new Map(intervals.map((i) => [i.driver_number, i]));
  const sorted     = [...positions].sort((a, b) => a.position - b.position);

  // Last lap per driver
  const lastLapMap = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const d of drivers) {
      const dl = laps.filter((l) => l.driver_number === d.driver_number && l.lap_duration != null)
        .sort((a, b) => b.lap_number - a.lap_number);
      m.set(d.driver_number, dl[0]?.lap_duration ?? null);
    }
    return m;
  }, [laps, drivers]);

  // Best lap time (for purple sector coloring)
  const bestLap = useMemo(() => {
    const ts = laps.map((l) => l.lap_duration).filter((t): t is number => t != null && t > 60);
    return ts.length ? Math.min(...ts) : null;
  }, [laps]);

  // In-pit detection
  const inPitSet = useMemo(() => {
    const s = new Set<number>();
    for (const pit of pits) {
      if (pit.lap_number >= state.currentLap - 1 && pit.lap_number <= state.currentLap) s.add(pit.driver_number);
    }
    return s;
  }, [pits, state.currentLap]);

  // ── Compute per-car SVG positions ─────────────────────────────────────────
  const carPoints = useMemo(() => {
    if (!totalLength || !pathRef.current) return [];

    return sorted.map((pos) => {
      let fraction: number;

      if (driverTrackPositions) {
        // Simulator: continuous 0-1 fraction updated at 20fps
        const f = driverTrackPositions.get(pos.driver_number) ?? -1;
        if (f < 0) return null; // DNS
        fraction = f;
      } else if (layout.isFromAPI) {
        // Live mode: we have real GPS coords from state.locations
        const loc = state.locations.find((l) => l.driver_number === pos.driver_number);
        if (!loc) return null;
        const { cx, cy } = layout.toSvg(loc.x, loc.y);
        const driver = driverMap.get(pos.driver_number);
        if (!driver) return null;
        return { ...pos, x: cx, y: cy, driver };
      } else {
        // Static fallback: estimate from gap
        const intv  = intervalMap.get(pos.driver_number);
        const gap   = pos.position === 1 ? 0 : Math.abs(Number(intv?.gap_to_leader ?? 0));
        fraction = ((1 - Math.min(gap / AVG_LAP_S, 0.98)) + 1) % 1;
      }

      const pt     = pathRef.current!.getPointAtLength(fraction * totalLength);
      const driver = driverMap.get(pos.driver_number);
      if (!driver) return null;
      return { ...pos, x: pt.x, y: pt.y, driver };
    }).filter(Boolean) as Array<{ driver_number: number; position: number; x: number; y: number; driver: typeof drivers[0] }>;
  }, [totalLength, sorted, intervalMap, driverTrackPositions, layout, state.locations, driverMap]);

  // ── DRS zone polylines ────────────────────────────────────────────────────
  const drsPolylines = useMemo(() => {
    if (!totalLength || !pathRef.current) return [];
    return DRS_ZONES.map(([s, e]) => {
      const steps = 30;
      const pts: string[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = s + (e - s) * (i / steps);
        const p = pathRef.current!.getPointAtLength(t * totalLength);
        pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      return pts.join(' ');
    });
  }, [totalLength]);

  // ── Sector + turn label positions ────────────────────────────────────────
  const sectorPts = useMemo(() => {
    if (!totalLength || !pathRef.current) return [];
    return SECTOR_FRACS.map((sf) => {
      const p = pathRef.current!.getPointAtLength(sf.frac * totalLength);
      return { label: sf.label, x: p.x, y: p.y };
    });
  }, [totalLength]);

  const turnPts = useMemo(() => {
    if (!totalLength || !pathRef.current) return [];
    return TURN_LABELS.map(([frac, label]) => {
      const p = pathRef.current!.getPointAtLength((frac as number) * totalLength);
      return { label, x: p.x, y: p.y };
    });
  }, [totalLength]);

  // ── Kerb markers: alternating coloured dashes along corners ───────────────
  // Sample points near each turn, place small coloured stripes
  const kerbPts = useMemo(() => {
    if (!totalLength || !pathRef.current) return [];
    const pts: Array<{ x: number; y: number; nx: number; ny: number; i: number }> = [];
    // Kerb marker ranges aligned with new path fractions
    const TURN_RANGES: Array<[number, number]> = [
      [0.13, 0.20], // T1
      [0.20, 0.28], // T2-T3 chicane
      [0.36, 0.44], // T4-T5
      [0.58, 0.66], // T8
      [0.73, 0.80], // T9-T10
      [0.83, 0.91], // T11-T12 chicane
      [0.91, 0.97], // T13-T14
    ];
    for (const [s, e] of TURN_RANGES) {
      const steps = 6;
      for (let k = 0; k <= steps; k++) {
        const t  = s + (e - s) * (k / steps);
        const t2 = s + (e - s) * (Math.min(k + 0.5, steps) / steps);
        const p  = pathRef.current!.getPointAtLength(t * totalLength);
        const p2 = pathRef.current!.getPointAtLength(t2 * totalLength);
        const dx = p2.x - p.x, dy = p2.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        pts.push({ x: p.x, y: p.y, nx: -dy / len, ny: dx / len, i: k });
      }
    }
    return pts;
  }, [totalLength]);

  return (
    <div style={{ display: 'flex', gap: '12px', padding: '16px', height: '100%', alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* ── SVG Track ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg
          viewBox={layout.viewBox}
          style={{ width: '100%', maxHeight: '74vh', background: '#030712', borderRadius: '12px', border: '1px solid #1f2937', display: 'block' }}
        >
          <defs>
            <filter id="glow-car" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* === Track surface layers === */}
          {/* Outer kerb border (widest) */}
          <path d={ALBERT_PARK_PATH} fill="none" stroke="#4b5563" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
          {/* Track tarmac */}
          <path d={ALBERT_PARK_PATH} fill="none" stroke="#1e293b" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
          {/* Centre line (subtle) */}
          <path d={ALBERT_PARK_PATH} fill="none" stroke="#0f172a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 18" opacity={0.6} />

          {/* Reference path (invisible, used for getPointAtLength) */}
          <path ref={pathRef} d={ALBERT_PARK_PATH} fill="none" stroke="none" />

          {/* === Kerb markers at corners === */}
          {kerbPts.map((kp, ki) => {
            const col = kp.i % 2 === 0 ? '#ef4444' : '#ffffff';
            const size = 5;
            return (
              <rect
                key={ki}
                x={kp.x + kp.nx * 9 - size / 2}
                y={kp.y + kp.ny * 9 - size / 2}
                width={size}
                height={size}
                fill={col}
                opacity={0.7}
                transform={`rotate(${Math.atan2(kp.ny, kp.nx) * 180 / Math.PI}, ${kp.x + kp.nx * 9}, ${kp.y + kp.ny * 9})`}
              />
            );
          })}

          {/* === DRS zones (green highlight along track edge) === */}
          {drsPolylines.map((pts, i) => (
            <polyline key={i} points={pts} fill="none" stroke="#22c55e" strokeWidth={5} strokeOpacity={0.55} strokeLinecap="round" />
          ))}

          {/* === Pit lane === */}
          <path d={PIT_LANE_PATH} fill="none" stroke="#374151" strokeWidth={10} strokeLinecap="round" />
          <path d={PIT_LANE_PATH} fill="none" stroke="#0f172a" strokeWidth={6} strokeLinecap="round" />
          {/* Pit box markers */}
          {[178, 202, 226, 250, 274, 298, 320].map((y) => (
            <line key={y} x1={622} y1={y} x2={635} y2={y} stroke="#374151" strokeWidth={1} />
          ))}
          <text x={638} y={255} fontSize={8} fill="#4b5563" transform="rotate(90 638 255)">PIT LANE</text>

          {/* === Start / Finish line === */}
          <line x1={600} y1={130} x2={622} y2={130} stroke="#ffffff" strokeWidth={4} />
          {/* Chequered pattern */}
          {[0,1,2,3].map((i) => (
            <rect key={i} x={600 + i * 5} y={128} width={5} height={4}
              fill={i % 2 === 0 ? '#fff' : '#000'} />
          ))}
          <text x={628} y={134} fontSize={9} fill="#9ca3af" fontWeight="600">S/F</text>

          {/* === Sector boundaries === */}
          {sectorPts.map((sp) => (
            <g key={sp.label}>
              <circle cx={sp.x} cy={sp.y} r={5} fill="#f59e0b" />
              <text x={sp.x + 8} y={sp.y + 4} fontSize={8} fill="#f59e0b" fontWeight="700">S{sp.label}</text>
            </g>
          ))}

          {/* === Turn labels === */}
          {turnPts.map((tp) => (
            <text key={tp.label} x={tp.x} y={tp.y - 12} textAnchor="middle" fontSize={8} fill="#4b5563" fontWeight="600">
              {tp.label}
            </text>
          ))}

          {/* === DRS label on pit straight === */}
          <text x={632} y={155} fontSize={8} fill="#4ade80" opacity={0.8}>DRS</text>

          {/* === API source indicator === */}
          {layout.isFromAPI && (
            <text x={10} y={14} fontSize={9} fill="#22c55e" opacity={0.6}>● Live GPS</text>
          )}

          {/* === Car dots — drawn last (on top) === */}
          {carPoints.map(({ driver_number, position, x, y, driver }) => {
            const color    = getTeamColor(driver.team_name, driver.team_colour);
            const isTop3   = position <= 3;
            const isPitting = inPitSet.has(driver_number);
            const dotX     = isPitting ? 627 : x;
            const dotY     = isPitting ? 190 + position * 10 : y;

            // Text contrast
            const darkTeams = new Set(['Mercedes', 'Alpine', 'McLaren']);
            const textFill  = darkTeams.has(driver.team_name) ? '#000' : '#fff';

            return (
              <g key={driver_number} filter={isTop3 ? 'url(#glow-soft)' : undefined}>
                {/* Pulse ring for leader */}
                {position === 1 && (
                  <circle cx={dotX} cy={dotY} r={15} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
                )}
                {/* Shadow */}
                <circle cx={dotX + 1} cy={dotY + 1} r={9} fill="rgba(0,0,0,0.5)" />
                {/* Main dot */}
                <circle cx={dotX} cy={dotY} r={9} fill={color} stroke="#000" strokeWidth={1.5} />
                {/* Position number */}
                <text x={dotX} y={dotY + 4} textAnchor="middle" fontSize="8" fontWeight="bold" fill={textFill} style={{ pointerEvents: 'none' }}>
                  {position}
                </text>
                {/* Name label for top 5 */}
                {position <= 5 && (
                  <text
                    x={dotX}
                    y={dotY - 14}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="700"
                    fill={color}
                    stroke="#030712"
                    strokeWidth="2.5"
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none' }}
                  >
                    {driver.name_acronym}
                  </text>
                )}
                {/* PIT indicator */}
                {isPitting && (
                  <text x={dotX} y={dotY + 22} textAnchor="middle" fontSize="7" fill="#60a5fa" fontWeight="700">PIT</text>
                )}
              </g>
            );
          })}

          {/* Circuit label */}
          <text x={10} y={VIEW_H - 10} fontSize={10} fill="#1e293b" fontWeight="700">
            Albert Park Circuit · Melbourne · 5.278 km · 14 Turns
          </text>
        </svg>
      </div>

      {/* ── Side Panel ─────────────────────────────────────────────────────── */}
      <div style={{ width: '255px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '74vh', overflowY: 'auto' }}>

        {/* Legend */}
        <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px 12px', border: '1px solid #1f2937', fontSize: '10px', color: '#6b7280' }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4b5563' }}>Legend</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '18px', height: '3px', backgroundColor: '#22c55e', opacity: 0.7, borderRadius: '1px' }} />
              DRS zone
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              Sector boundary
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '3px', backgroundImage: 'repeating-linear-gradient(90deg,#fff 0,#fff 4px,#000 4px,#000 8px)' }} />
              Start / Finish
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              / <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />
              Kerb markers
            </div>
          </div>
        </div>

        {/* Live leaderboard */}
        <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1f2937', overflow: 'hidden' }}>
          <div style={{ padding: '7px 12px', borderBottom: '1px solid #1f2937', fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Standings
          </div>

          {sorted.map((pos) => {
            const driver  = driverMap.get(pos.driver_number);
            if (!driver) return null;
            const color   = getTeamColor(driver.team_name, driver.team_colour);
            const intv    = intervalMap.get(pos.driver_number);
            const lastLap = lastLapMap.get(pos.driver_number);
            const stint   = (stints[pos.driver_number] ?? []).at(-1);
            const ers     = ersStates[pos.driver_number];
            const pitting = inPitSet.has(pos.driver_number);
            const isFastest = lastLap != null && bestLap != null && lastLap <= bestLap * 1.002;

            return (
              <div key={pos.driver_number} style={{
                display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px',
                borderBottom: '1px solid #0a0f1e',
                backgroundColor: pos.position === 1 ? 'rgba(239,68,68,0.05)' : 'transparent',
              }}>
                {/* Position */}
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', width: '13px', textAlign: 'right', flexShrink: 0 }}>{pos.position}</span>

                {/* Team stripe */}
                <div style={{ width: '3px', height: '28px', borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />

                {/* Driver */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#f3f4f6' }}>{driver.name_acronym}</span>
                    {pitting && <span style={{ fontSize: '7px', backgroundColor: '#1e3a5f', color: '#60a5fa', padding: '1px 3px', borderRadius: '2px', fontWeight: 700 }}>PIT</span>}
                  </div>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: pos.position === 1 ? '#fbbf24' : '#6b7280' }}>
                    {pos.position === 1 ? 'Leader' : formatGap(intv?.gap_to_leader)}
                  </span>
                </div>

                {/* Tyre */}
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: getTyreColor(stint?.compound ?? ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 900, color: '#000', flexShrink: 0 }}>
                  {getTyreLabel(stint?.compound ?? '')}
                </div>

                {/* Last lap time */}
                <span style={{ fontSize: '8px', fontFamily: 'monospace', color: isFastest ? '#a855f7' : '#4b5563', flexShrink: 0, width: '44px', textAlign: 'right' }}>
                  {formatLapTime(lastLap)}
                </span>

                {/* ERS vertical bar */}
                {ers && (
                  <div style={{ width: '5px', height: '22px', backgroundColor: '#1f2937', borderRadius: '2px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <div style={{ height: `${ers.charge}%`, backgroundColor: ers.charge > 66 ? '#22c55e' : ers.charge > 33 ? '#f59e0b' : '#ef4444', transition: 'height 0.4s', borderRadius: '2px' }} />
                  </div>
                )}
              </div>
            );
          })}

          {!sorted.length && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#4b5563', fontSize: '12px' }}>
              Waiting for data…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
