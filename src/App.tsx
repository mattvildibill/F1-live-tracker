import { lazy, Suspense, useEffect, useState } from 'react';
const SectorAnalysis = lazy(() => import('./components/SectorAnalysis'));
const Telemetry = lazy(() => import('./components/Telemetry'));
const PitLane = lazy(() => import('./components/PitLane'));
const Championship = lazy(() => import('./components/Championship'));
import SessionPicker from './components/SessionPicker';
import { useOpenF1 } from './hooks/useOpenF1';
import { useRaceSimulator } from './hooks/useRaceSimulator';
import { useRaceWeekend } from './hooks/useRaceWeekend';
import { useHistoricalReplay } from './hooks/useHistoricalReplay';
import RaceWeekend from './components/RaceWeekend';
import Header from './components/Header';
const RaceTower = lazy(() => import('./components/RaceTower'));
const TrackMap = lazy(() => import('./components/TrackMap'));
const ERSPanel = lazy(() => import('./components/ERSPanel'));
const TyreStrategy = lazy(() => import('./components/TyreStrategy'));
const HeadToHead = lazy(() => import('./components/HeadToHead'));
const GapChart = lazy(() => import('./components/GapChart'));
const TeamRadio = lazy(() => import('./components/TeamRadio'));
import ShareView from './components/ShareView';
import { parseViewState, viewURL } from './utils/viewState';
import { TOTAL_SIM_SECONDS } from './hooks/useRaceSimulator';
import SimulatorControls from './components/SimulatorControls';
const CommandCenter = lazy(() => import('./components/CommandCenter'));
import { EMPTY_STATE } from './utils/data';
import { panelsForMode, primaryPanelIds, type Mode, type Tab } from './utils/panels';
import './index.css';
export default function App() {
  const [initialView] = useState(() => parseViewState(location.search, TOTAL_SIM_SECONDS));
  const [mode, setMode] = useState<Mode>(initialView.mode); const [tab, setTab] = useState<Tab>(initialView.panel); const [sessionOverride, setSessionOverride] = useState<number | null>(initialView.session); const [revision, setRevision] = useState(0);
  const weekend = useRaceWeekend(mode === 'live' || tab === 'weekend');
  const live = useOpenF1(mode === 'live' && (!!weekend.race || sessionOverride !== null), sessionOverride, weekend.race, revision, tab);
  const demo = useRaceSimulator(mode === 'demo', initialView.time);
  const replay = useHistoricalReplay(mode === 'replay', initialView.year, initialView.round);
  const pausedTime = demo.controls.isPlaying ? null : Math.round(demo.controls.simTime);
  useEffect(() => {
    const url = viewURL(location.href, { mode, panel: tab, time: pausedTime ?? 0, year: replay.year, round: replay.round, session: sessionOverride });
    if (mode === 'demo' && pausedTime === null) return;
    if (mode === 'replay' && replay.loading && !replay.round) return;
    history.replaceState(history.state, '', url);
  }, [mode, tab, pausedTime, replay.year, replay.round, replay.loading, sessionOverride]);
  const getShareURL = () => viewURL(location.href, { mode, panel: tab, time: demo.controls.simTime, year: replay.year, round: replay.round, session: sessionOverride }).href;
  const state = mode === 'demo' ? { ...demo.state, source: 'demo' as const, statusText: 'Synthetic demo' } : mode === 'replay' ? replay.state ?? EMPTY_STATE : live;
  function changeMode(next: Mode) { setMode(next); setTab(next === 'live' ? 'weekend' : 'tower'); }
  const headerState = mode === 'live' && !state.session && weekend.race ? { ...state, statusText: 'Race weekend', session: { session_key: 0, session_name: weekend.race.raceName, circuit_short_name: weekend.race.Circuit.circuitName, year: Number(weekend.race.season), session_type: 'Race', date_start: `${weekend.race.date}T${weekend.race.time || '12:00:00Z'}`, date_end: '', status: '', meeting_key: 0, country_name: weekend.race.Circuit.Location.country, location: weekend.race.Circuit.Location.locality, gmt_offset: '' } } : state;
  const availablePanels = panelsForMode(mode);
  const analysisPanels = availablePanels.filter(([id]) => !primaryPanelIds.has(id));
  const content = () => {
    if (tab === 'weekend') return <RaceWeekend weekend={weekend} timingError={mode === 'live' ? live.error : undefined} onTiming={() => { setMode('live'); setTab('tower'); }} onReplay={() => changeMode('replay')} onDemo={() => changeMode('demo')} />;
    if (tab === 'champ') return <Championship />;
    if (mode === 'replay' && (replay.loading || replay.error || !replay.state)) return <div className="content-empty"><h2>{replay.loading ? 'Loading recorded race laps…' : 'Replay unavailable'}</h2><p>{replay.error || replay.loadingMessage}</p>{!replay.loading && <div className="weekend-actions"><button onClick={replay.retry}>Retry replay</button><button className="primary-action" onClick={() => changeMode('demo')}>Try the interactive demo</button></div>}</div>;
    if (mode === 'live' && !state.positions.length) return <div className="content-empty"><p className="eyebrow">{weekend.race?.Circuit.Location.country || 'FORMULA 1'}</p><h2>{live.error ? 'Live timing is unavailable' : 'Waiting for session timing'}</h2><p>{live.error || 'Positions appear when the provider publishes session data. No race data is substituted.'}</p><div className="weekend-actions"><button className="primary-action" onClick={() => changeMode('demo')}>Try the interactive demo</button><button onClick={() => setTab('weekend')}>View race weekend</button><button onClick={() => setRevision(n => n + 1)}>Retry timing</button><a href="https://www.formula1.com/en/live-timing" target="_blank" rel="noreferrer">Official timing ↗</a></div></div>;
    if (tab === 'command') return <CommandCenter state={state} driverTrackPositions={mode === 'demo' ? demo.driverTrackPositions : undefined} />;
    if (tab === 'tower') return <RaceTower state={state} />;
    if (tab === 'map') return <TrackMap state={state} driverTrackPositions={mode === 'demo' ? demo.driverTrackPositions : undefined} />;
    if (tab === 'sectors') return <SectorAnalysis state={state} />;
    if (tab === 'telemetry') return <Telemetry state={state} />;
    if (tab === 'ers') return <ERSPanel state={state} />;
    if (tab === 'tyres') return <TyreStrategy state={state} />;
    if (tab === 'pits') return <PitLane state={state} />;
    if (tab === 'h2h') return <HeadToHead state={state} />;
    if (tab === 'gaps') return <GapChart state={state} />;
    return <TeamRadio state={state} />;
  };
  return <div className="app-shell"><Header state={headerState}/><div className="mode-bar"><div className="mode-group" aria-label="Data mode">{(['live','replay','demo'] as const).map(m => <button key={m} className={mode === m ? 'active' : ''} aria-pressed={mode === m} onClick={() => changeMode(m)}>{m === 'live' ? '● Live / Weekend' : m === 'replay' ? '↺ Race replay' : 'Offline demo'}</button>)}</div><span className="mode-description">{mode === 'live' ? 'Schedule, standings and session timing' : mode === 'replay' ? 'Recorded race laps · 1996 onward, where available' : 'Generated Melbourne scenario · not live data'}</span>{mode === 'live' && <><SessionPicker currentSessionKey={sessionOverride} onSelect={s => { setSessionOverride(s); setTab('tower'); }}/><button onClick={() => { weekend.refresh(); setRevision(n => n+1); }}>Refresh</button></>}</div>
    {mode === 'replay' && <div className="replay-controls"><label>Season <select aria-label="Replay season" value={replay.year} onChange={e => replay.setYear(Number(e.target.value))}>{Array.from({length:new Date().getFullYear()-1995},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y}>{y}</option>)}</select></label><label>Race <select aria-label="Replay race" value={replay.round} onChange={e => replay.setRound(e.target.value)} disabled={!replay.races.length}>{replay.races.map(r=><option key={r.round} value={r.round}>R{r.round} · {r.raceName}</option>)}</select></label><button disabled={!replay.state} className="primary-action" onClick={replay.toggle}>{replay.playing ? 'Pause' : replay.progress >= replay.totalLaps && replay.totalLaps ? 'Replay' : 'Play replay'}</button><button disabled={!replay.state} onClick={replay.reset}>Reset</button><label>Pace <select aria-label="Replay pace" value={replay.speed} onChange={e=>replay.setSpeed(Number(e.target.value))}>{[1,2,5,10].map(n=><option key={n} value={n}>{n / 2} laps/s</option>)}</select></label><label className="replay-seek">Lap {Math.floor(replay.progress)} / {replay.totalLaps}<input aria-label="Replay lap" type="range" min="0" max={replay.totalLaps || 1} step="1" value={replay.progress} disabled={!replay.state} onChange={e => replay.setProgress(Number(e.target.value))}/></label></div>}
    {mode === 'demo' && <SimulatorControls controls={demo.controls} currentLap={state.currentLap}/>}
    <nav className="panel-navigation" aria-label="Tracker panels">
      <div className="panel-tabs">{availablePanels.filter(([id]) => primaryPanelIds.has(id)).map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} aria-controls="tracker-content" onClick={() => setTab(id)}>{label}</button>)}
        <label className={`analysis-picker ${primaryPanelIds.has(tab) ? '' : 'active'}`}><span className="sr-only">More analysis panels</span><select aria-label="More analysis panels" value={primaryPanelIds.has(tab) ? '' : tab} onChange={e => setTab(e.target.value as Tab)}><option value="" disabled>More analysis</option>{analysisPanels.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      </div>
      <label className="mobile-panel-picker"><span>View</span><select aria-label="Tracker panel" value={tab} onChange={e => setTab(e.target.value as Tab)}>{availablePanels.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </nav>
    {mode === 'replay' && replay.state && <div className="data-note">Recorded lap-end classification and lap times. This is a lap-by-lap replay, not GPS playback. Telemetry, sectors, tyres and live gaps are not included in this source.</div>}
    {mode === 'live' && state.source === 'espn' && <div role="status" className="data-note">ESPN race leaderboard · Refreshes every 20 seconds{state.isStale ? ' · Provider updates are delayed' : ''}. Detailed telemetry, gaps, tyres and lap times are unavailable while OpenF1 requires authenticated access.{tab === 'weekend' && <button onClick={() => setTab('tower')}>View live leaderboard</button>}</div>}
    {mode === 'live' && !!live.loadingFeeds?.length && state.positions.length > 0 && tab !== 'weekend' && <div role="status" className="data-note">Timing is ready. Loading {live.loadingFeeds.join(', ').toLowerCase()}…</div>}
    {mode === 'live' && live.error && tab !== 'weekend' && state.positions.length > 0 && <div role="status" className="data-note">{live.error} Last successful update: {state.lastUpdated?.toLocaleTimeString() || 'none'}.</div>}
    <main id="tracker-content" tabIndex={0} aria-label={`${availablePanels.find(([id]) => id === tab)?.[1] ?? 'Tracker'} content`} className={tab === 'command' ? 'command-content' : ''}><Suspense fallback={<div className="content-empty">Loading panel…</div>}>{content()}</Suspense></main><footer className="app-footer"><div className="footer-data"><span>{mode==='live' ? `${live.source === 'espn' ? 'ESPN leaderboard' : 'OpenF1 timing'} · ${live.lastUpdated ? 'Checked '+live.lastUpdated.toLocaleTimeString() : 'Waiting for feed'}` : mode === 'replay' ? 'Historical data: Jolpica-F1 · Classification at each recorded lap' : 'Synthetic demonstration · Generated timing and ERS'}</span><details className="project-note"><summary>Why I built this</summary><p>I started building this while watching a race because I wanted to see more timing and telemetry than the TV broadcast showed.</p><p>Live timing comes from OpenF1; race calendars and recorded laps come from Jolpica. The separate demo is synthetic, with no live feed required.</p></details></div><ShareView getURL={getShareURL}/><a href="https://mattvildibill.com" target="_blank" rel="noreferrer">Matt Vildibill ↗</a></footer></div>;
}
