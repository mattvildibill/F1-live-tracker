import { useMemo, useRef, useEffect, useState } from 'react';
import type { F1State } from '../types/f1';
import { useTrackLayout } from '../hooks/useTrackLayout';
import { getTeamColor } from '../utils/teamColors';
import { formatLapTime, formatGap, getTyreColor, getTyreLabel } from '../utils/tyreUtils';
import { computeBestLaps, lapTimeColor } from '../utils/lapUtils';
import { currentNeutralisation, NEUTRALISATION_LABEL, NEUTRALISATION_COLOR } from '../utils/raceStatus';
import { STARTING_GRID } from '../mocks/australianGP2026';

interface Props {
  state: F1State;
  driverTrackPositions?: Map<number, number>;
}

// ─── Tiny vertical ERS bar ────────────────────────────────────────────────────
function ERSMini({ charge }: { charge: number }) {
  const color = charge > 66 ? '#22c55e' : charge > 33 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ width: 4, height: 20, backgroundColor: '#1f2937', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ height: `${charge}%`, backgroundColor: color, transition: 'height 0.4s', borderRadius: 2 }} />
    </div>
  );
}

// ─── Compact flag/category badge ──────────────────────────────────────────────
function RCBadge({ message, flag }: { message: string; flag: string | null }) {
  const msg = message.toLowerCase();
  const f = (flag ?? '').toLowerCase();
  if (f === 'red' || msg.includes('red flag'))   return <span style={badge('#dc2626','#fca5a5')}>RED</span>;
  if (msg.includes('safety car deployed'))        return <span style={badge('#d97706','#fde68a')}>SC</span>;
  if (msg.includes('virtual safety car'))         return <span style={badge('#d97706','#fde68a')}>VSC</span>;
  if (f === 'yellow' || msg.includes('yellow'))  return <span style={badge('#ca8a04','#fef08a')}>YEL</span>;
  if (msg.includes('drs enabled'))               return <span style={badge('#16a34a','#bbf7d0')}>DRS✓</span>;
  if (msg.includes('drs disabled'))              return <span style={badge('#4b5563','#9ca3af')}>DRS✗</span>;
  if (f === 'green' || msg.includes('track clear')) return <span style={badge('#15803d','#bbf7d0')}>GRN</span>;
  return <span style={badge('#374151','#6b7280')}>MSG</span>;
}
function badge(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 3, letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0 };
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151', padding: '3px 8px', borderBottom: '1px solid #1f2937', backgroundColor: '#060d1a' }}>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CommandCenter({ state, driverTrackPositions }: Props) {
  const {
    drivers, positions, intervals, laps, pits, raceControl,
    stints, ersStates, weather, locations, currentLap, totalLaps, isLive, isStale,
  } = state;

  const sessionKey = state.session?.session_key;
  const layout = useTrackLayout(sessionKey);

  // ── Mini map path ref ─────────────────────────────────────────────────────
  const pathRef = useRef<SVGPathElement>(null);
  const [totalLength, setTotalLength] = useState(0);
  useEffect(() => {
    if (pathRef.current) setTotalLength(pathRef.current.getTotalLength());
  }, [layout.svgPath]);

  // ── Derived maps ──────────────────────────────────────────────────────────
  const driverMap   = useMemo(() => new Map(drivers.map(d => [d.driver_number, d])), [drivers]);
  const intervalMap = useMemo(() => new Map(intervals.map(i => [i.driver_number, i])), [intervals]);
  const sorted      = useMemo(() => [...positions].sort((a, b) => a.position - b.position), [positions]);

  const lastLapMap = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const dn of driverMap.keys()) {
      const dl = laps.filter(l => l.driver_number === dn && l.lap_duration != null)
        .sort((a, b) => b.lap_number - a.lap_number);
      m.set(dn, dl[0]?.lap_duration ?? null);
    }
    return m;
  }, [driverMap, laps]);

  const pitCountMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const dn of driverMap.keys()) m.set(dn, pits.filter(p => p.driver_number === dn).length);
    return m;
  }, [driverMap, pits]);

  const inPitSet = useMemo(() =>
    new Set(pits.filter(p => p.lap_number >= currentLap - 1 && p.lap_number <= currentLap).map(p => p.driver_number)),
    [pits, currentLap]
  );

  // ── Best laps (overall + per driver) ──────────────────────────────────────
  const bestLaps = useMemo(() => computeBestLaps(laps), [laps]);
  const fastestLap = bestLaps.overall;

  // ── Overtake pairs (within 1 s) ───────────────────────────────────────────
  const overtakePairs = useMemo(() => {
    const pairs: { behind: number; ahead: number; gap: number }[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const behindIntv = intervalMap.get(sorted[i].driver_number);
      const aheadIntv  = intervalMap.get(sorted[i - 1].driver_number);
      let gap: number | null = null;
      if (behindIntv?.interval != null) {
        gap = Number(behindIntv.interval);
      } else if (behindIntv?.gap_to_leader != null && aheadIntv?.gap_to_leader != null) {
        gap = Number(behindIntv.gap_to_leader) - Number(aheadIntv.gap_to_leader);
      }
      if (gap !== null && gap >= 0 && gap <= 1.0)
        pairs.push({ behind: sorted[i].driver_number, ahead: sorted[i - 1].driver_number, gap });
    }
    return pairs;
  }, [sorted, intervalMap]);

  // ── Tyre distribution ─────────────────────────────────────────────────────
  const tyreDist = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const pos of sorted) {
      const s = (stints[pos.driver_number] ?? []).at(-1);
      if (s?.compound) dist[s.compound] = (dist[s.compound] ?? 0) + 1;
    }
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, [sorted, stints]);

  // ── Active flags ─────────────────────────────────────────────────────────
  const activeFlag = useMemo(() => currentNeutralisation(raceControl), [raceControl]);

  // ── Mini map car points ───────────────────────────────────────────────────
  const miniCarPoints = useMemo(() => {
    if (!totalLength || !pathRef.current) return [];
    return sorted.map(pos => {
      let fraction: number;
      if (driverTrackPositions) {
        const f = driverTrackPositions.get(pos.driver_number) ?? -1;
        if (f < 0) return null;
        fraction = f;
      } else if (layout.isFromAPI) {
        const loc = locations.find(l => l.driver_number === pos.driver_number);
        if (!loc) return null;
        const { cx, cy } = layout.toSvg(loc.x, loc.y);
        const driver = driverMap.get(pos.driver_number);
        if (!driver) return null;
        return { ...pos, x: cx, y: cy, driver };
      } else {
        const intv = intervalMap.get(pos.driver_number);
        const gap  = pos.position === 1 ? 0 : Math.abs(Number(intv?.gap_to_leader ?? 0));
        fraction = ((1 - Math.min(gap / 83.0, 0.98)) + 1) % 1;
      }
      const pt = pathRef.current!.getPointAtLength(fraction * totalLength);
      const driver = driverMap.get(pos.driver_number);
      if (!driver) return null;
      return { ...pos, x: pt.x, y: pt.y, driver };
    }).filter(Boolean) as Array<{ driver_number: number; position: number; x: number; y: number; driver: typeof drivers[0] }>;
  }, [totalLength, sorted, intervalMap, driverTrackPositions, layout, locations, driverMap]);

  const raceLaps = Math.max(totalLaps, currentLap, 1);
  const rcSorted = useMemo(() => [...raceControl].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [raceControl]);

  const flagBarColor = activeFlag ? NEUTRALISATION_COLOR[activeFlag] : null;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!sorted.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12, color: '#4b5563' }}>
        <span style={{ fontSize: 32 }}>🎮</span>
        <p style={{ fontSize: 14 }}>Command Center will populate once race data loads</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#030712' }}>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 10px', backgroundColor: '#060d1a', borderBottom: `1px solid ${flagBarColor ?? '#1f2937'}`, flexWrap: 'wrap', flexShrink: 0 }}>
        {/* Flag status */}
        {activeFlag && (
          <span style={{ fontSize: 11, fontWeight: 800, color: flagBarColor!, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 8px', backgroundColor: flagBarColor! + '22', borderRadius: 4, border: `1px solid ${flagBarColor!}44` }}>
            {NEUTRALISATION_LABEL[activeFlag]}
          </span>
        )}

        <span style={{ fontSize: 11, color: '#6b7280' }}>
          {state.session ? `${state.session.circuit_short_name} · ${state.session.session_name}` : 'Loading…'}
        </span>

        {currentLap > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb' }}>
            LAP <span style={{ color: '#ef4444' }}>{currentLap}</span>
            {totalLaps > 0 && <span style={{ color: '#6b7280' }}> / {totalLaps}</span>}
          </span>
        )}

        {weather && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', fontSize: 10, color: '#6b7280', flexWrap: 'wrap' }}>
            <span>🌡 <b style={{ color: '#e5e7eb' }}>{weather.track_temperature.toFixed(0)}°</b> track</span>
            <span><b style={{ color: '#e5e7eb' }}>{weather.air_temperature.toFixed(0)}°</b> air</span>
            <span>💧 <b style={{ color: '#e5e7eb' }}>{weather.humidity.toFixed(0)}%</b></span>
            <span>💨 <b style={{ color: '#e5e7eb' }}>{weather.wind_speed.toFixed(1)}</b> m/s</span>
            {weather.rainfall > 0 && <span style={{ color: '#60a5fa' }}>🌧 WET</span>}
          </div>
        )}

        {isLive && <span style={{ fontSize: 9, fontWeight: 800, color: '#f87171', padding: '1px 6px', backgroundColor: '#450a0a', borderRadius: 3, letterSpacing: '0.1em' }}>● LIVE</span>}
        {isStale && <span style={{ fontSize: 9, color: '#f59e0b', padding: '1px 6px', backgroundColor: '#451a03', borderRadius: 3 }}>STALE</span>}
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 1, backgroundColor: '#111827' }}>

        {/* ── LEFT: Race standings ─────────────────────────────────────────── */}
        <div style={{ flex: '0 0 44%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#030712' }}>
          <SectionHead>Race Standings</SectionHead>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ color: '#4b5563', fontSize: 9, borderBottom: '1px solid #1f2937', position: 'sticky', top: 0, backgroundColor: '#030712', zIndex: 1 }}>
                  <th style={th('center')}>P</th>
                  <th style={th('center')}>Δ</th>
                  <th style={th('left')}>Driver</th>
                  <th style={th('right')}>Gap</th>
                  <th style={th('right')}>Int</th>
                  <th style={th('right')}>Last</th>
                  <th style={th('center')}>Tyre</th>
                  <th style={th('center')}>Pit</th>
                  <th style={th('center')}>ERS</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((pos, idx) => {
                  const driver   = driverMap.get(pos.driver_number);
                  if (!driver) return null;
                  const intv     = intervalMap.get(pos.driver_number);
                  const lastLap  = lastLapMap.get(pos.driver_number);
                  const ers      = ersStates[pos.driver_number];
                  const teamColor = getTeamColor(driver.team_name, driver.team_colour);
                  const isPitting = inPitSet.has(pos.driver_number);
                  const pitCount  = pitCountMap.get(pos.driver_number) ?? 0;
                  const gridPos   = STARTING_GRID[pos.driver_number];
                  const delta     = gridPos != null && gridPos > 0 ? gridPos - pos.position : null;
                  const driverStints = stints[pos.driver_number] ?? [];
                  const stint    = driverStints.at(-1);
                  const isFL     = fastestLap?.driver_number === pos.driver_number;

                  return (
                    <tr key={pos.driver_number} style={{
                      borderBottom: '1px solid #0a0f1a',
                      backgroundColor: idx === 0 ? '#0d1117' : isPitting ? '#0c1929' : 'transparent',
                    }}>
                      <td style={td('center')}>
                        <span style={{ fontWeight: 800, color: idx < 3 ? '#f3f4f6' : '#6b7280' }}>{pos.position}</span>
                      </td>
                      <td style={td('center', 9)}>
                        {isPitting ? (
                          <span style={{ color: '#60a5fa', fontWeight: 700 }}>PIT</span>
                        ) : delta === null || delta === 0 ? (
                          <span style={{ color: '#374151' }}>—</span>
                        ) : delta > 0 ? (
                          <span style={{ color: '#22c55e' }}>▲{delta}</span>
                        ) : (
                          <span style={{ color: '#ef4444' }}>▼{Math.abs(delta)}</span>
                        )}
                      </td>
                      <td style={td('left')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 2, height: 16, borderRadius: 1, backgroundColor: teamColor, flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, color: '#f3f4f6' }}>{driver.name_acronym}</span>
                          {isFL && <span style={{ fontSize: 7, color: '#a855f7', fontWeight: 800 }}>FL</span>}
                        </div>
                      </td>
                      <td style={td('right', 10, '#9ca3af', 'mono')}>
                        {pos.position === 1
                          ? <span style={{ color: '#fbbf24', fontWeight: 700 }}>Leader</span>
                          : formatGap(intv?.gap_to_leader)}
                      </td>
                      <td style={td('right', 10, '#6b7280', 'mono')}>
                        {pos.position === 1 ? '—' : intv?.interval != null ? `+${Number(intv.interval).toFixed(3)}` : '—'}
                      </td>
                      <td style={td('right', 10, lapTimeColor(pos.driver_number, lastLap, bestLaps), 'mono')}>
                        {formatLapTime(lastLap)}
                      </td>
                      <td style={td('center')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: getTyreColor(stint?.compound ?? ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 900, color: '#000', flexShrink: 0 }}>
                            {getTyreLabel(stint?.compound ?? '')}
                          </div>
                          <span style={{ fontSize: 9, color: '#6b7280' }}>{stint?.tyreAge ?? 0}L</span>
                        </div>
                      </td>
                      <td style={td('center', 10, '#6b7280', 'mono')}>
                        {pitCount > 0 ? pitCount : '—'}
                      </td>
                      <td style={td('center')}>
                        {ers ? <ERSMini charge={ers.charge} /> : <div style={{ width: 4, height: 20, backgroundColor: '#111827', borderRadius: 2 }} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── CENTER: Track map + Overtake zones ──────────────────────────── */}
        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#030712', borderLeft: '1px solid #111827', borderRight: '1px solid #111827' }}>

          {/* Mini track map */}
          <SectionHead>Track Position {layout.isFromAPI && <span style={{ color: '#22c55e', fontWeight: 400 }}>● GPS</span>}</SectionHead>
          <div style={{ flex: '0 0 auto', padding: '4px 6px' }}>
            <svg
              viewBox={layout.viewBox}
              style={{ width: '100%', maxHeight: 220, display: 'block', backgroundColor: '#030712', borderRadius: 6, border: '1px solid #1f2937' }}
            >
              {/* Track surface */}
              <path d={layout.svgPath} fill="none" stroke="#374151" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
              <path d={layout.svgPath} fill="none" stroke="#1e293b" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
              {/* Invisible reference path for getPointAtLength */}
              <path ref={pathRef} d={layout.svgPath} fill="none" stroke="none" />
              {/* S/F line */}
              <line x1={206} y1={391} x2={194} y2={404} stroke="#ffffff" strokeWidth={2} opacity={0.5} />
              {/* Car dots */}
              {miniCarPoints.map(({ driver_number, position, x, y, driver }) => {
                const color = getTeamColor(driver.team_name, driver.team_colour);
                const isPitting = inPitSet.has(driver_number);
                const dotX = isPitting ? 218 : x;
                const dotY = isPitting ? 428 - (position % 8) * 6 : y;
                return (
                  <g key={driver_number}>
                    {position === 1 && <circle cx={dotX} cy={dotY} r={10} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />}
                    <circle cx={dotX} cy={dotY} r={6} fill={color} stroke="#000" strokeWidth={1} />
                    <text x={dotX} y={dotY + 2.5} textAnchor="middle" fontSize="5" fontWeight="bold" fill="#fff" style={{ pointerEvents: 'none' }}>{position}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Overtake Zone */}
          <SectionHead>⚡ Overtake Zone</SectionHead>
          <div style={{ padding: '4px 8px', flex: '0 0 auto', minHeight: 28 }}>
            {overtakePairs.length === 0 ? (
              <p style={{ fontSize: 10, color: '#374151', padding: '4px 0' }}>No battles within 1 second</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {overtakePairs.map(({ behind, ahead, gap }) => {
                  const dBehind = driverMap.get(behind), dAhead = driverMap.get(ahead);
                  if (!dBehind || !dAhead) return null;
                  const ersBehind = ersStates[behind];
                  return (
                    <div key={`${behind}-${ahead}`} style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#0c1a0c', border: '1px solid #14532d55', borderRadius: 4, padding: '2px 6px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getTeamColor(dBehind.team_name, dBehind.team_colour) }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#f3f4f6' }}>{dBehind.name_acronym}</span>
                      <span style={{ fontSize: 9, color: '#6b7280' }}>→</span>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getTeamColor(dAhead.team_name, dAhead.team_colour) }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#f3f4f6' }}>{dAhead.name_acronym}</span>
                      <span style={{ fontSize: 10, color: '#fbbf24', fontFamily: 'monospace', marginLeft: 'auto' }}>+{gap.toFixed(3)}s</span>
                      {ersBehind && <ERSMini charge={ersBehind.charge} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fastest lap */}
          <SectionHead>🟣 Fastest Lap</SectionHead>
          <div style={{ padding: '4px 8px', flex: '0 0 auto' }}>
            {fastestLap ? (() => {
              const d = driverMap.get(fastestLap.driver_number);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {d && <div style={{ width: 3, height: 14, borderRadius: 1, backgroundColor: getTeamColor(d.team_name, d.team_colour) }} />}
                  <span style={{ fontWeight: 700, color: '#a855f7', fontSize: 11 }}>{d?.name_acronym ?? '?'}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e9d5ff' }}>{formatLapTime(fastestLap.lap_duration)}</span>
                  <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 'auto' }}>L{fastestLap.lap_number}</span>
                </div>
              );
            })() : <span style={{ fontSize: 10, color: '#374151' }}>No data yet</span>}
          </div>

          {/* Tyre distribution */}
          <SectionHead>Current Tyres</SectionHead>
          <div style={{ padding: '4px 8px', flex: '0 0 auto' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tyreDist.map(([compound, count]) => (
                <div key={compound} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: getTyreColor(compound) }} />
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{getTyreLabel(compound)}</span>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>×{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Race control ──────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#030712' }}>
          <SectionHead>Race Control</SectionHead>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {rcSorted.length === 0 ? (
              <p style={{ fontSize: 10, color: '#374151', padding: 4 }}>No messages yet</p>
            ) : (
              rcSorted.map((rc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, padding: '3px 5px', backgroundColor: '#060d1a', borderRadius: 4, border: '1px solid #1f2937' }}>
                  <RCBadge message={rc.message} flag={rc.flag} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {rc.lap_number && <span style={{ fontSize: 8, color: '#4b5563', display: 'block' }}>L{rc.lap_number}</span>}
                    <p style={{ fontSize: 10, color: '#d1d5db', margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>{rc.message}</p>
                  </div>
                  <span style={{ fontSize: 8, color: '#374151', fontFamily: 'monospace', flexShrink: 0 }}>
                    {(() => { try { return new Date(rc.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return ''; } })()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── BOTTOM: Compact tyre strategy ────────────────────────────────── */}
      <div style={{ flexShrink: 0, backgroundColor: '#030712', borderTop: '1px solid #1f2937' }}>
        <SectionHead>
          Tyre Strategy — Lap {currentLap} / {raceLaps}
        </SectionHead>
        <div style={{ padding: '4px 8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sorted.map(pos => {
            const driver = driverMap.get(pos.driver_number);
            if (!driver) return null;
            const driverStints = stints[pos.driver_number] ?? [];
            const teamColor = getTeamColor(driver.team_name, driver.team_colour);
            const pitDurations = pits.filter(p => p.driver_number === pos.driver_number)
              .sort((a, b) => a.lap_number - b.lap_number);

            return (
              <div key={pos.driver_number} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 14 }}>
                {/* Driver label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, width: 52, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: '#4b5563', width: 10, textAlign: 'right' }}>{pos.position}</span>
                  <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: teamColor }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af' }}>{driver.name_acronym}</span>
                </div>

                {/* Stint bars */}
                <div style={{ flex: 1, position: 'relative', height: 10, backgroundColor: '#0a0f1a', borderRadius: 2 }}>
                  {driverStints.map((stint, i) => {
                    const startPct = ((stint.startLap - 1) / raceLaps) * 100;
                    const widthPct = ((stint.endLap - stint.startLap + 1) / raceLaps) * 100;
                    return (
                      <div
                        key={i}
                        style={{
                          position: 'absolute', top: 1, bottom: 1, borderRadius: 2,
                          left: `${startPct}%`, width: `${widthPct}%`,
                          backgroundColor: getTyreColor(stint.compound), opacity: 0.9,
                        }}
                        title={`${stint.compound} L${stint.startLap}–${stint.endLap}`}
                      />
                    );
                  })}
                  {/* Pit stop markers */}
                  {pitDurations.map((pit, i) => {
                    const pct = ((pit.lap_number) / raceLaps) * 100;
                    return (
                      <div key={i} style={{
                        position: 'absolute', top: 0, bottom: 0, width: 2,
                        left: `${pct}%`, backgroundColor: '#ffffff', opacity: 0.5,
                        borderRadius: 1,
                      }} title={pit.pit_duration != null ? `${pit.pit_duration.toFixed(1)}s` : 'Pit'} />
                    );
                  })}
                  {/* Current lap marker */}
                  {currentLap > 0 && (
                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, left: `${(currentLap / raceLaps) * 100}%`, backgroundColor: '#ef4444', opacity: 0.8 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────
function th(align: 'left' | 'right' | 'center'): React.CSSProperties {
  return { textAlign: align, padding: '3px 5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' };
}
function td(align: 'left' | 'right' | 'center', fontSize = 11, color = '#d1d5db', family?: 'mono'): React.CSSProperties {
  return { textAlign: align, padding: '2px 5px', fontSize, color, fontFamily: family === 'mono' ? 'monospace' : undefined, whiteSpace: 'nowrap' };
}
