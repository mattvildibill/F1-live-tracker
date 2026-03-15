import { useState } from 'react';
import { useOpenF1 } from './hooks/useOpenF1';
import { useRaceSimulator } from './hooks/useRaceSimulator';
import Header from './components/Header';
import RaceTower from './components/RaceTower';
import TrackMap from './components/TrackMap';
import ERSPanel from './components/ERSPanel';
import TyreStrategy from './components/TyreStrategy';
import HeadToHead from './components/HeadToHead';
import GapChart from './components/GapChart';
import TeamRadio from './components/TeamRadio';
import SimulatorControls from './components/SimulatorControls';
import './index.css';

type Tab = 'tower' | 'map' | 'ers' | 'tyres' | 'h2h' | 'gaps' | 'radio';
type ViewMode = 'simulator' | 'live';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tower', label: '🏁 Race Tower' },
  { id: 'map', label: '🗺 Track Map' },
  { id: 'ers', label: '⚡ ERS / Battery' },
  { id: 'tyres', label: '🔴 Tyre Strategy' },
  { id: 'h2h', label: '⚔️ Head to Head' },
  { id: 'gaps', label: '📈 Gap Chart' },
  { id: 'radio', label: '📻 Race Control' },
];

function modeBtn(active: boolean, danger = false): React.CSSProperties {
  return {
    padding: '5px 14px',
    borderRadius: '5px',
    border: `1px solid ${active ? (danger ? '#7f1d1d' : '#1e3a5f') : '#1f2937'}`,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: active ? (danger ? '#450a0a' : '#0c1929') : 'transparent',
    color: active ? (danger ? '#fca5a5' : '#93c5fd') : '#6b7280',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  };
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('f1-view-mode') as ViewMode) ?? 'simulator'
  );
  const [activeTab, setActiveTab] = useState<Tab>('tower');

  // OpenF1 is only polled when the user explicitly selects Live mode
  const liveState = useOpenF1(viewMode === 'live');
  const { state: simState, controls, driverTrackPositions } = useRaceSimulator();

  const isSimActive = viewMode === 'simulator';
  const state = isSimActive ? simState : liveState;

  const loading = viewMode === 'live' &&
    !state.session && !state.positions.length && !state.drivers.length;

  function switchMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem('f1-view-mode', mode);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      <Header state={state} />

      {/* ── Mode selector bar ──────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#060d1a',
        borderBottom: '1px solid #1f2937',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, flexShrink: 0 }}>
          View Mode
        </span>

        <button style={modeBtn(isSimActive)} onClick={() => switchMode('simulator')}>
          🎮 Simulator
        </button>

        <button style={modeBtn(!isSimActive, true)} onClick={() => switchMode('live')}>
          🔴 Live
        </button>

        {/* Contextual info */}
        {isSimActive ? (
          <span style={{ fontSize: '11px', color: '#374151', marginLeft: '4px' }}>
            2026 Australian GP · No API calls made
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: '#374151', marginLeft: '4px' }}>
            {state.isStale
              ? '⚠ API unreachable — showing cached data'
              : state.session
              ? `Polling OpenF1 every 3s · ${state.session.session_name} · ${state.session.location}`
              : 'Connecting to OpenF1…'}
          </span>
        )}

        {/* Live status badge */}
        {!isSimActive && state.isLive && (
          <span style={{
            marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 7px',
            borderRadius: '4px', backgroundColor: '#450a0a', color: '#fca5a5',
            letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
          }}>
            ● LIVE
          </span>
        )}
        {!isSimActive && !state.isLive && state.session && (
          <span style={{
            marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 7px',
            borderRadius: '4px', backgroundColor: '#1f2937', color: '#6b7280',
            letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
          }}>
            Archived Session
          </span>
        )}
      </div>

      {/* Simulator controls — shown in simulator mode */}
      {isSimActive && <SimulatorControls controls={controls} currentLap={state.currentLap} />}

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#111827', borderBottom: '1px solid #1f2937', overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #ef4444' : '2px solid transparent',
                color: activeTab === tab.id ? '#ffffff' : '#6b7280',
                cursor: 'pointer',
                backgroundColor: activeTab === tab.id ? 'rgba(31,41,55,0.5)' : 'transparent',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '256px', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px', border: '2px solid #ef4444',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Connecting to OpenF1…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : isSimActive && controls.simTime === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '16px' }}>
            <div style={{ fontSize: '48px' }}>🏎</div>
            <p style={{ color: '#9ca3af', fontSize: '16px', fontWeight: 500 }}>2026 Australian Grand Prix — Melbourne</p>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Press <strong style={{ color: '#86efac' }}>▶ Start Race</strong> to begin the simulation
            </p>
            <p style={{ color: '#374151', fontSize: '12px', maxWidth: '380px', textAlign: 'center', lineHeight: 1.5 }}>
              Switch to <strong style={{ color: '#93c5fd' }}>🔴 Live</strong> mode above to connect to OpenF1
              and follow a real session.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'tower' && <RaceTower state={state} />}
            {activeTab === 'map' && <TrackMap state={state} driverTrackPositions={isSimActive ? driverTrackPositions : undefined} />}
            {activeTab === 'ers' && <ERSPanel state={state} />}
            {activeTab === 'tyres' && <TyreStrategy state={state} />}
            {activeTab === 'h2h' && <HeadToHead state={state} />}
            {activeTab === 'gaps' && <GapChart state={state} />}
            {activeTab === 'radio' && <TeamRadio state={state} />}
          </>
        )}
      </main>

      <footer style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#4b5563', borderTop: '1px solid #1f2937' }}>
        {isSimActive
          ? `Simulating 2026 Australian GP · Lap ${state.currentLap} of 57 · No OpenF1 requests`
          : `Data from OpenF1 API · Polling every 3s · ${state.lastUpdated ? `Last updated ${state.lastUpdated.toLocaleTimeString()}` : 'Connecting…'}`}
      </footer>
    </div>
  );
}
