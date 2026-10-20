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
  const isFinished = simTime >= totalSimSeconds;
  return (
    <section className="demo-controls" aria-label="Synthetic demo playback">
      <div className="demo-primary">
        <button onClick={isPlaying ? pause : play} className="demo-play">{isPlaying ? 'Pause demo' : isFinished ? 'Replay demo' : 'Play demo'}</button>
        <button onClick={reset} aria-label="Reset demo to the starting grid">Reset</button>
        <span className="demo-lap">{simTime === 0 ? 'Starting grid' : `Lap ${currentLap} / ${TOTAL_LAPS}`}</span>
      </div>
      <label className="demo-seek"><span className="sr-only">Demo race time</span><input aria-label="Demo race time" type="range" min={0} max={totalSimSeconds} step={1} value={Math.round(simTime)} onChange={e => seekTo(Number(e.target.value))}/><span className="mono">{fmtTime(simTime)} / {fmtTime(totalSimSeconds)}</span></label>
      <details className="demo-options"><summary>Playback speed · {speed}×</summary><div role="group" aria-label="Demo playback speed">{SPEEDS.map(s => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s as PlaybackSpeed)}>{s}×</button>)}</div></details>
      <span className="sr-only">This is a synthetic Australian Grand Prix scenario, not live or recorded race timing.</span>
    </section>
  );
}
