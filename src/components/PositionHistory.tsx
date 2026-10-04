import type { F1State } from '../types/f1';
import { getTeamColor } from '../utils/teamColors';
export default function PositionHistory({ state, compact = false }: { state: F1State; compact?: boolean }) {
  const history = state.positionHistory ?? [];
  const lastLaps = [...new Set(history.map(p => p.lap))].sort((a,b)=>a-b).slice(-15);
  const top = [...state.positions].sort((a,b)=>a.position-b.position).slice(0, compact ? 5 : 10);
  const max = Math.max(state.drivers.length, 2); const width=700, height=compact?240:400;
  const x=(lap:number)=>45+(lastLaps.indexOf(lap)/Math.max(1,lastLaps.length-1))*560;
  const y=(position:number)=>25+(position-1)/(max-1)*(height-60);
  if (!history.length) return <div className="content-empty" style={{padding:compact?16:35}}><h2 style={{fontSize:compact?14:22}}>Track coordinates unavailable</h2><p style={{fontSize:12}}>No verified circuit geometry or GPS positions are available for this session. Timing remains in the tower; another circuit is never substituted.</p></div>;
  return <section style={{padding:compact?10:24}}><h2 style={{fontSize:compact?12:20,marginBottom:8}}>Race position history</h2><p className="fine-print">Recorded lap-end positions · {state.session?.location} · {compact?'Top 5':'Top 10'} current drivers</p><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Race position by lap" style={{width:'100%',marginTop:12}}>{[1,5,10,15,20].filter(p=>p<=max).map(p=><g key={p}><line x1="40" x2="610" y1={y(p)} y2={y(p)} stroke="#273449"/><text x="12" y={y(p)+4} fill="#94a3b8" fontSize="11">{p}</text></g>)}{lastLaps.filter((_,i)=>i%3===0).map(l=><text key={l} x={x(l)} y={height-8} fill="#94a3b8" fontSize="11" textAnchor="middle">L{l}</text>)}{top.map(p=>{ const d=state.drivers.find(d=>d.driver_number===p.driver_number); if(!d)return null; const rows=history.filter(r=>r.driver_number===p.driver_number && lastLaps.includes(r.lap)); const color=getTeamColor(d.team_name,d.team_colour); const last=rows.at(-1); return <g key={p.driver_number}><polyline points={rows.map(r=>`${x(r.lap)},${y(r.position)}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5"/>{last&&<><circle cx={x(last.lap)} cy={y(last.position)} r="3" fill={color}/><text x="625" y={y(last.position)+4} fontSize="12" fill={color}>{d.name_acronym}</text></>}</g>;})}</svg></section>;
}
