import type { SimControls } from '../hooks/useRaceSimulator';
import { SPEEDS, TOTAL_LAPS } from '../hooks/useRaceSimulator';
import type { PlaybackSpeed } from '../hooks/useRaceSimulator';

interface Props {
  controls: SimControls;
  currentLap: number;
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SimulatorControls({ controls, currentLap }: Props) {
  const { simTime, totalSimSeconds, isPlaying, speed, play, pause, reset, seekTo, setSpeed } = controls;
  const progress = totalSimSeconds > 0 ? simTime / totalSimSeconds : 0;
  const isFinished = simTime >= totalSimSeconds;
  const hasStarted = simTime > 0;

  return (
    <div style={{
      backgroundColor: '#0a0f1e',
      borderBottom: '1px solid #1e3a5f',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      position: 'relative',
    }}>

      {/* Badge */}
      <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
        Simulation · 2026 Australian GP
      </span>

      {/* Reset */}
      <button onClick={reset} title="Reset" style={btn('#1f2937', '#9ca3af')}>⏮</button>

      {/* Play / Pause */}
      <button onClick={isPlaying ? pause : play} style={btn(isPlaying ? '#7f1d1d' : '#14532d', isPlaying ? '#fca5a5' : '#86efac')}>
        {isPlaying ? '⏸ Pause' : isFinished ? '↩ Replay' : !hasStarted ? '▶ Start Race' : '▶ Resume'}
      </button>

      {/* Speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        <span style={{ fontSize: '10px', color: '#6b7280', marginRight: '2px' }}>Speed:</span>
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => setSpeed(s as PlaybackSpeed)} style={{
            padding: '3px 7px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.1s',
            backgroundColor: speed === s ? '#1d4ed8' : '#1f2937',
            color: speed === s ? '#fff' : '#6b7280',
          }}>
            {s}×
          </button>
        ))}
      </div>

      {/* Scrubber */}
      <div style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="range"
          min={0}
          max={totalSimSeconds}
          step={1}
          value={Math.round(simTime)}
          onChange={(e) => seekTo(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#ef4444', cursor: 'pointer' }}
        />
      </div>

      {/* Lap + time display */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, minWidth: '80px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6', fontFamily: 'monospace' }}>
          {!hasStarted ? 'Pre-Race' : `Lap ${currentLap} / ${TOTAL_LAPS}`}
        </span>
        <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
          {fmtTime(simTime)} / {fmtTime(totalSimSeconds)}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', backgroundColor: '#1f2937', pointerEvents: 'none' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: '#ef4444', transition: 'width 0.05s linear' }} />
      </div>

      {isFinished && (
        <span style={{ backgroundColor: '#713f12', color: '#fde68a', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>
          🏁 Race Complete
        </span>
      )}
    </div>
  );
}

function btn(bg: string, fg: string): React.CSSProperties {
  return { padding: '4px 11px', borderRadius: '5px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: bg, color: fg, whiteSpace: 'nowrap', flexShrink: 0 };
}
